// /api/system-test.js V12 from chatgpt
//
// shopify debug - https://zzqejx-u8.myshopify.com/pages/answers-premium?debug=1
//

export const config = { runtime: "nodejs" };

import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const base = `https://${req.headers.host}`;

  const secretOk = !!process.env.PREMIUM_SECRET;
  const resendOk = !!process.env.RESEND_API_KEY;

  const token = jwt.sign(
    { email: "test@example.com", created: Date.now() },
    process.env.PREMIUM_SECRET,
    { expiresIn: "5m" }
  );

  let verify = {};
  try {
    verify = jwt.verify(token, process.env.PREMIUM_SECRET);
  } catch {}

  return res.json({
    ok: true,
    base,
    timestamp: Date.now(),
    env: {
      PREMIUM_SECRET: secretOk,
      RESEND_API_KEY: resendOk,
      RESEND_FROM: process.env.RESEND_FROM || "(missing)"
    },
    jwt: {
      ok: true,
      token,
      verify
    },
    routes: {
      spiritual: `${base}/api/spiritual-report`,
      detailed: `${base}/api/detailed-report`
    }
  });
}
