import crypto from "node:crypto";

export type PayFastMode = "sandbox" | "live";

export function payFastMode(): PayFastMode {
  return process.env.PAYFAST_MODE === "live" ? "live" : "sandbox";
}

export function payFastProcessUrl() {
  return payFastMode() === "live"
    ? "https://www.payfast.co.za/eng/process"
    : "https://sandbox.payfast.co.za/eng/process";
}

export function payFastValidateUrl() {
  return payFastMode() === "live"
    ? "https://www.payfast.co.za/eng/query/validate"
    : "https://sandbox.payfast.co.za/eng/query/validate";
}

function phpUrlEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/~/g, "%7E");
}

export function createPayFastParameterString(
  values: Record<string, string>,
  includePassphrase = true
) {
  const parts = Object.entries(values)
    .filter(([key, value]) => key !== "signature" && value !== "")
    .map(([key, value]) => `${key}=${phpUrlEncode(value.trim())}`);

  const passphrase = process.env.PAYFAST_PASSPHRASE?.trim();
  if (includePassphrase && passphrase) {
    parts.push(`passphrase=${phpUrlEncode(passphrase)}`);
  }
  return parts.join("&");
}

export function createPayFastSignature(values: Record<string, string>) {
  return crypto.createHash("md5").update(createPayFastParameterString(values)).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a.toLowerCase());
  const right = Buffer.from(b.toLowerCase());
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
