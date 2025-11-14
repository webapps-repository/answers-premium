// /api/utils/verify-recaptcha.js
export async function verifyRecaptcha(token) {
  try {
    if (!token) return { ok: false, reason: "missing_token" };

    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) return { ok: false, reason: "missing_secret" };

    const url = `https://www.google.com/recaptcha/api/siteverify`;
    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);

    const resp = await fetch(url, {
      method: "POST",
      body: params
    });

    const data = await resp.json();
    return { ok: data.success === true, raw: data };
  } catch (err) {
    console.error("verifyRecaptcha error:", err);
    return { ok: false, error: err.message };
  }
}
