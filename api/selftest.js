// /api/selftest.js
import { classifyQuestion } from "./utils/classify-question.js";
import { personalSummaries, technicalSummary } from "./utils/generate-insights.js";
import { generatePdfBuffer } from "./utils/generate-pdf.js";
import { sendEmailHTML } from "./utils/send-email.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  try {
    // 1. Classifier test
    const cls = await classifyQuestion("Should I move house?");
    if (!cls.type) throw new Error("Classifier failed");

    // 2. Technical summary test
    const t = await technicalSummary("What is quantum tunneling?");
    if (!t.answer) throw new Error("Technical summary failed");

    // 3. PDF test
    const pdf = await generatePdfBuffer({
      headerBrand:"Melodies Web",
      titleText:"Self-Test Report",
      mode:"technical",
      question:"System self-check",
      answer:"All systems OK",
      numerologyPack:{ technicalKeyPoints:["PDF OK"], technicalNotes:"PDF rendered" }
    });
    if (!pdf) throw new Error("PDF generation failed");

    // 4. Email test
    await sendEmailHTML({
      to: process.env.ALERT_EMAIL,
      subject:"Self-Test: OK",
      html:`<p>Self-test passed at ${new Date().toISOString()}</p>`,
      attachments:[{filename:"selftest.pdf", buffer:pdf}]
    });

    return res.status(200).json({ ok:true, details:"All checks passed" });

  } catch (e) {
    console.error("Self-test failed:", e);
    return res.status(500).json({ ok:false, error:e.message });
  }
}
