export async function verifyRecaptcha(token) {
  try {
    const secret = process.env.RECAPTCHA_SECRET_KEY || "";
    if (!secret) return { ok: false, reason: "missing-secret" };
    if (!token)  return { ok: false, reason: "missing-token" };

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    return { ok: !!data.success, data };
  } catch (e) {
    console.error("recaptcha error:", e);
    return { ok: false, reason: "exception" };
  }
}
