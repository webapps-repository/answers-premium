// /api/utils/verify-recaptcha.js
// reCAPTCHA v2 checkbox verification

export async function verifyRecaptcha(token) {
  try {
    if (!token) return { ok:false, error:"missing token" };

    const secret = process.env.RECAPTCHA_SECRET_KEY || "";
    if (!secret) return { ok:false, error:"missing server secret" };

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify",{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({ secret, response:token })
    });

    const json = await res.json();
    return json.success ? { ok:true } : { ok:false, error:"invalid", details:json };

  } catch(e){
    console.error("reCAPTCHA error:",e);
    return { ok:false, error:String(e) };
  }
}
