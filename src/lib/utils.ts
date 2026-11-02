import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { site } from "./site";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const moneyFormatters = new Map<string, Intl.NumberFormat>();

/** Formats integer cents, e.g. 1299 → "€12.99". */
export function formatMoney(cents: number, currency: string = site.currency) {
  const key = currency;
  let f = moneyFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(site.locale, { style: "currency", currency, minimumFractionDigits: 2 });
    moneyFormatters.set(key, f);
  }
  return f.format((cents || 0) / 100);
}

/** Parses a user-entered amount ("12,50" or "12.5") into cents. */
export function parseMoney(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = typeof input === "number" ? input : Number(String(input).replace(",", ".").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return dateFmt.format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return dateTimeFmt.format(new Date(d));
}

export function timeAgo(d: Date | string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 45) return "just now";
  const units: [number, string][] = [
    [60, "minute"],
    [3600, "hour"],
    [86400, "day"],
    [604800, "week"],
    [2629800, "month"],
    [31557600, "year"],
  ];
  let unit = "minute";
  let value = 1;
  for (let i = units.length - 1; i >= 0; i--) {
    if (diff >= units[i][0]) {
      unit = units[i][1];
      value = Math.floor(diff / units[i][0]);
      break;
    }
  }
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Random code without ambiguous characters, e.g. for order numbers. */
export function randomCode(length = 6) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function ratingOf(sum: number, count: number) {
  return count > 0 ? Math.round((sum / count) * 10) / 10 : null;
}

/** Average stars as a share of five ("98.4"), or null without reviews. */
export function ratingPercent(sum: number, count: number) {
  if (count <= 0) return null;
  const pct = (sum / count / 5) * 100;
  return pct >= 99.95 ? "100" : pct.toFixed(1).replace(/\.0$/, "");
}

/** Seen within the last ten minutes. */
export function isOnline(lastSeenAt: Date | string | null | undefined) {
  return !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < 10 * 60_000;
}

/** Reads a positive integer page number from a search param. */
export function pageParam(v: string | string[] | undefined) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function str(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}
