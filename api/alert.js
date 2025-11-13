// /api/alert.js
import { sendEmailHTML } from "./utils/send-email.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  try {
    const url = `${process.env.SELFTEST_URL}/api/selftest`;
    const r = await fetch(url);
    const j = await r.json();

    if (!j.ok) {
      await sendEmailHTML({
        to: process.env.ALERT_EMAIL,
        subject:"❌ Melodies Web ALERT: Function FAILED",
        html:`<p>The self-test failed:</p><pre>${JSON.stringify(j,null,2)}</pre>`
      });

      return res.status(500).json({ ok:false, error:j.error });
    }

    return res.status(200).json({ ok:true });

  } catch (e) {
    await sendEmailHTML({
      to: process.env.ALERT_EMAIL,
      subject:"❌ Melodies Web ALERT: SYSTEM ERROR",
      html:`<p>Critical system error:</p><pre>${String(e)}</pre>`
    });

    return res.status(500).json({ ok:false, error:String(e) });
  }
}
