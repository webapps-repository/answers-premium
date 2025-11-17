// /api/utils/verify-recaptcha.js
export async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET;

  if (!secret) {
    console.error("MISSING RECAPTCHA_SECRET");
    return { ok: false, error: "Missing secret" };
  }

  if (!token) return { ok: false, error: "Missing token" };

  try {
    const res = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${secret}&response=${token}`
      }
    );

    const json = await res.json();

    if (json.success) return { ok: true };
    return { ok: false, error: "Not verified", details: json };

  } catch (err) {
    return { ok: false, error: err.message };
  }
}
