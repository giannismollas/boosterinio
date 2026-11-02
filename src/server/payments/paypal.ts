import { absoluteUrl, site } from "@/lib/site";

/*
  PayPal Orders v2 over plain fetch. Flow: create order → buyer approves on
  PayPal → returns to /api/payments/paypal/return → we capture → order paid.
  The webhook handles buyers who approve but never come back.
*/

export function paypalEnabled() {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function base() {
  return process.env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

let cached: { token: string; expires: number } | null = null;

async function token() {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

async function api<T>(path: string, init: { method: string; body?: unknown; idempotencyKey?: string }): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${await token()}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "PayPal-Request-Id": init.idempotencyKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`PayPal ${init.method} ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  return json as T;
}

const toValue = (cents: number) => (cents / 100).toFixed(2);

export async function createPaypalOrder(order: { id: string; number: string; title: string; total: number; currency: string }) {
  const res = await api<{ id: string; links: { rel: string; href: string }[] }>("/v2/checkout/orders", {
    method: "POST",
    idempotencyKey: `create-${order.id}-${order.total}`,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: order.id,
          custom_id: order.id,
          invoice_id: order.number,
          description: order.title.slice(0, 127),
          amount: { currency_code: order.currency.toUpperCase(), value: toValue(order.total) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: site.name,
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: absoluteUrl(`/api/payments/paypal/return?order=${order.id}`),
            cancel_url: absoluteUrl(`/checkout/${order.number}?cancelled=1`),
          },
        },
      },
    },
  });
  const link = res.links.find((l) => l.rel === "payer-action" || l.rel === "approve");
  if (!link) throw new Error("PayPal did not return an approval link");
  return { url: link.href, ref: res.id };
}

type CaptureResult = {
  status: string;
  purchase_units: {
    custom_id?: string;
    payments?: { captures?: { id: string; status: string; amount: { value: string; currency_code: string }; custom_id?: string }[] };
  }[];
};

/** Captures an approved PayPal order. Returns capture info when completed. */
export async function capturePaypalOrder(paypalOrderId: string) {
  let res: CaptureResult;
  try {
    res = await api<CaptureResult>(`/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: "POST",
      idempotencyKey: `capture-${paypalOrderId}`,
    });
  } catch (err) {
    // Already captured (e.g. webhook won the race): read the order instead.
    if (String(err).includes("ORDER_ALREADY_CAPTURED")) {
      res = await api<CaptureResult>(`/v2/checkout/orders/${paypalOrderId}`, { method: "GET" });
    } else {
      throw err;
    }
  }
  const capture = res.purchase_units[0]?.payments?.captures?.[0];
  if (!capture || capture.status !== "COMPLETED") return null;
  return {
    captureId: capture.id,
    amount: Math.round(Number(capture.amount.value) * 100),
    currency: capture.amount.currency_code,
    orderId: res.purchase_units[0]?.custom_id ?? capture.custom_id ?? null,
  };
}

export async function refundPaypal(captureId: string) {
  await api(`/v2/payments/captures/${captureId}/refund`, { method: "POST", body: {}, idempotencyKey: `refund-${captureId}` });
}

/** Verifies a webhook with PayPal's verification endpoint. */
export async function verifyPaypalWebhook(headers: Headers, event: unknown) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const res = await api<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    },
  });
  return res.verification_status === "SUCCESS";
}
