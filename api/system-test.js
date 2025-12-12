// /api/system-test.js V12 from chatgpt
//
// shopify debug - https://zzqejx-u8.myshopify.com/pages/answers-premium?debug=1
//

// /api/system-test-email.js
export const config = { runtime: "nodejs" };

import { Resend } from "resend";

export default async function handler(req, res) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddr  = process.env.RESEND_FROM;

  const resend = new Resend(resendKey);

  const results = {
    env: {
      RESEND_API_KEY: !!resendKey,
      RESEND_FROM: fromAddr,
    },
    tests: {}
  };

  // ---------------------------
  // 1. TEST BASIC CONNECTIVITY
  // ---------------------------
  try {
    // Resend does not have a "ping" endpoint → but listing domains ensures key is valid
    const domains = await resend.domains.list();
    results.tests.domainList = { ok: true, domains };
  } catch (err) {
    results.tests.domainList = {
      ok: false,
      error: String(err),
    };
  }

  // ---------------------------
  // 2. TEST SEND BASIC EMAIL
  // ---------------------------
  try {
    const out = await resend.emails.send({
      from: fromAddr,
      to: "henrycvalk@proton.me",
      subject: "TEST #1 — Basic Email",
      html: "<h1>System Test Email — Basic OK</h1>"
    });

    results.tests.basicSend = { ok: true, out };
  } catch (err) {
    results.tests.basicSend = { ok: false, error: String(err), raw: err };
  }

  // ---------------------------
  // 3. TEST SEND EMAIL WITH ATTACHMENT
  // ---------------------------
  try {
    const testPDF = Buffer.from("TEST PDF CONTENT").toString("base64");

    const out = await resend.emails.send({
      from: fromAddr,
      to: "henrycvalk@proton.me",
      subject: "TEST #2 — Attachment Email",
      html: "<p>Testing attachment email</p>",
      attachments: [
        {
          filename: "test.pdf",
          content: testPDF,
          encoding: "base64",
        }
      ]
    });

    results.tests.attachmentSend = { ok: true, out };
  } catch (err) {
    results.tests.attachmentSend = { ok: false, error: String(err), raw: err };
  }

  // ---------------------------
  // 4. VERIFY RESEND “FROM” DOMAIN STATUS
  // ---------------------------
  try {
    const domains = await resend.domains.list();
    const match = domains.data.find(d => fromAddr.includes(d.name));

    results.tests.fromDomainStatus = match
      ? { ok: true, domain: match }
      : { ok: false, message: "From domain NOT found in your Resend project!" };
  } catch (err) {
    results.tests.fromDomainStatus = { ok: false, error: String(err) };
  }

  // ---------------------------
  // DONE
  // ---------------------------
  res.status(200).json(results);
}
