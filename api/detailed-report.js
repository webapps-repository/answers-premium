// /api/detailed-report.js

import formidable from "formidable";
import fs from "fs";

import { generateInsights } from "../lib/insights.js";
import { generatePDF } from "../lib/pdf.js";
import { sendEmailHTML } from "../lib/send-email.js";
// If you already have verifyRecaptcha / validateUploadedFile in lib/utils.js, you can import them too:
// import { verifyRecaptcha, validateUploadedFile } from "../lib/utils.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Requested-With"
  );
}

function parseForm(req) {
  const form = formidable({
    multiples: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);

    const fullName = fields.fullName?.toString() || "";
    const email = fields.email?.toString() || "";
    const dateOfBirth = fields.dateOfBirth?.toString() || "";
    const timeOfBirth = fields.timeOfBirth?.toString() || "";
    const birthPlace = fields.birthPlace?.toString() || "";
    const latitude = fields.latitude
      ? parseFloat(fields.latitude.toString())
      : undefined;
    const longitude = fields.longitude
      ? parseFloat(fields.longitude.toString())
      : undefined;
    const gender = fields.gender?.toString() || undefined;
    const question = fields.question?.toString() || "";

    const handSide = fields.handSide?.toString() || "left";

    if (!fullName || !email || !dateOfBirth) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields: fullName, email, dateOfBirth.",
      });
    }

    // Optional: captcha validation hook
    // const recaptchaToken = fields.recaptchaToken?.toString();
    // if (recaptchaToken && !(await verifyRecaptcha(recaptchaToken))) {
    //   return res.status(400).json({ ok: false, error: "reCAPTCHA failed." });
    // }

    // ---- read optional hand image ----
    let handImageBase64 = undefined;
    const handFile = files.handImage || files.hand || files.file;
    if (handFile && handFile.filepath) {
      const fileData = fs.readFileSync(handFile.filepath);
      handImageBase64 = fileData.toString("base64");
    }

    const person = {
      fullName,
      email,
      dateOfBirth,
      timeOfBirth,
      birthPlace,
      latitude,
      longitude,
      gender,
    };

    // ---- generate insights & PDF ----
    const insights = await generateInsights({
      person,
      question,
      handImageBase64,
      handSide,
    });

    const pdfBuffer = await generatePDF(insights);

    // ---- send premium email ----
    const subject =
      process.env.EMAIL_SUBJECT_PREMIUM || "Your Premium Spiritual Report";
    const html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <h2 style="margin-bottom: 8px;">Your Premium Spiritual Report</h2>
        <p>Hi ${fullName || "there"},</p>
        <p>
          Thank you for your purchase. Your full premium report is attached as a PDF.
          It weaves together your astrology chart, numerology profile and palmistry insights.
        </p>
        <p>
          We recommend reading it slowly, perhaps with a cup of tea, and returning to it
          whenever you are at a crossroads or seeking clarity.
        </p>
        <p>With warmth,<br/>The Spiritual Reports Team</p>
      </div>
    `;

    await sendEmailHTML({
      to: email,
      subject,
      html,
      pdfBuffer,
      pdfFilename: "premium-spiritual-report.pdf",
    });

    res.status(200).json({
      ok: true,
      message: "Premium report generated and emailed successfully.",
    });
  } catch (err) {
    console.error("detailed-report error:", err);
    res.status(500).json({
      ok: false,
      error: "Unexpected server error generating premium report.",
    });
  }
}
