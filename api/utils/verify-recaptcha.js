export async function verifyRecaptcha(token = "") {
  if (!token) return { success: false, error: "missing_token" };

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY || "",
        response: token,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error("Recaptcha error:", err);
    return { success: false, error: err.message };
  }
}
