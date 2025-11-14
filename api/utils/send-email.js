// /api/utils/send-email.js
// Resend email sender

import { Resend } from "resend";

export async function sendEmailHTML(opts={}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("Missing RESEND_API_KEY");
    return { success:false, error:"missing key" };
  }

  const resend = new Resend(key);

  const from = "Melodies Web <sales@hazcam.io>";

  try {
    const attachments = [];
    if (Array.isArray(opts.attachments)) {
      for (const a of opts.attachments) {
        if (a?.buffer && a?.filename)
          attachments.push({ filename:a.filename, content:a.buffer });
      }
    }

    const r = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html || "",
      attachments
    });

    if (r?.data?.id) return { success:true, id:r.data.id };
    return { success:false, error:"unexpected resend response" };

  } catch(e){
    console.error("Resend error:",e);
    return { success:false, error:String(e) };
  }
}
