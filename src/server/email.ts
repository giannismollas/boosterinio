import { site } from "@/lib/site";

/*
  Transactional email through Resend's HTTP API (no SDK needed).
  Without RESEND_API_KEY the message is logged instead, which is what you want
  in local development.
*/

type Mail = { to: string; subject: string; heading: string; body: string; cta?: { label: string; url: string } };

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function render({ heading, body, cta }: Mail) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;color:#cfcbe0;font-size:15px;line-height:1.6">${escape(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const button = cta
    ? `<p style="margin:22px 0"><a href="${escape(cta.url)}" style="display:inline-block;background:#ffd93b;color:#1d1600;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;font-family:Arial,sans-serif">${escape(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#0d0c12;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#15131d;border:1px solid #2b2739;border-radius:16px;overflow:hidden">
    <div style="height:8px;background:repeating-linear-gradient(-62deg,#ff2e88 0 10px,transparent 10px 16px,#2f6bff 16px 26px,transparent 26px 32px,#5cf2d6 32px 36px,transparent 36px 46px)"></div>
    <div style="padding:28px">
      <div style="font-weight:800;letter-spacing:2px;color:#f3f1fa;font-size:14px;margin-bottom:18px">${escape(site.name.toUpperCase())}</div>
      <h1 style="margin:0 0 16px;color:#f3f1fa;font-size:22px">${escape(heading)}</h1>
      ${paragraphs}${button}
      <p style="margin:24px 0 0;color:#8b86a2;font-size:12px">Questions? Reply to this email or open a ticket at ${escape(site.url)}/support</p>
    </div>
  </div></body></html>`;
}

export async function sendEmail(mail: Mail) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || `${site.name} <no-reply@${new URL(site.url).hostname}>`;
  if (!key) {
    console.info(`[email:dev] to=${mail.to} subject="${mail.subject}"${mail.cta ? ` link=${mail.cta.url}` : ""}`);
    return { ok: true as const, dev: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: render(mail), reply_to: site.supportEmail }),
    });
    if (!res.ok) {
      console.error("[email] send failed", res.status, await res.text());
      return { ok: false as const };
    }
    return { ok: true as const };
  } catch (err) {
    console.error("[email] send error", err);
    return { ok: false as const };
  }
}
