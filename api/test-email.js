// /api/test-email.js
import { sendEmailHTML } from "./utils/send-email.js";

export const config = { api: { bodyParser:false } };

export default async function handler(req, res) {
  try {
    await sendEmailHTML({
      to: process.env.ALERT_EMAIL,
      subject:"Melodies Web Test Email",
      html:`<p>This is a test email from Melodies Web at ${new Date().toISOString()}</p>`,
      attachments:[{
        filename:"test.txt",
        buffer:Buffer.from("Email system is working.")
      }]
    });

    return res.status(200).json({ ok:true, message:"Test email sent" });

  } catch (e) {
    console.error("Test-email error:", e);
    return res.status(500).json({ ok:false, error:String(e) });
  }
}
