type TurnstileResponse = {
  success: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

export async function verifyTurnstile(formData: FormData, expectedAction: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const token = String(formData.get("turnstileToken") || "");

  if (!secret) return process.env.NODE_ENV !== "production";
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store"
    });
    const result = (await response.json()) as TurnstileResponse;
    if (!result.success) return false;
    if (result.action && result.action !== expectedAction) return false;
    return true;
  } catch {
    return false;
  }
}
