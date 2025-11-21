// /api/spiritual-report.js — FINAL DEPLOY PATCH
export const config = {
  api: { bodyParser: false },
  runtime: "nodejs"
};

import formidable from "formidable";

import {
  applyCORS,
  normalize,
  validateUploadedFile,
  verifyRecaptcha,
  sendEmailHTML
} from "../lib/utils.js";

import { analyzePalm } from "../lib/engines.js";
import { generateInsights } from "../lib/insights.js";
import { generatePDFBufferFromHTML } from "../lib/pdf.js";

export default async function handler(req, res) {
  if (applyCORS(req, res)) return;

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const form = formidable({ keepExtensions: true });
    const { fields, files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f, fi) => err ? reject(err) : resolve({ fields: f, files: fi }))
    );

    const question = normalize(fields, "question");
    if (!question) return res.status(400).json({ error: "Missing question" });

    const recaptchaToken = normalize(fields, "recaptchaToken");
    const captcha = await verifyRecaptcha(recaptchaToken);
    if (!captcha.ok) return res.status(400).json({ error: "Invalid reCAPTCHA" });

    const isPersonal = normalize(fields, "isPersonal") === "true";
    const email = normalize(fields, "email");

    let palm = null;
    if (files.palmImage?.filepath) {
      palm = await analyzePalm({
        imageDescription: "Palm Image",
        handMeta: {}
      });
    }

    const enginesInput = {
      palm,
      numerology: isPersonal ? {
        fullName: normalize(fields, "fullName"),
        dateOfBirth: normalize(fields, "birthDate")
      } : null,
      astrology: isPersonal ? {
        birthDate: normalize(fields, "birthDate"),
        birthTime: normalize(fields, "birthTime"),
        birthLocation: normalize(fields, "birthPlace")
      } : null
    };

    const insights = await generateInsights({
      question,
      enginesInput
    });

    // ALWAYS RETURN SHORT ANSWER
    return res.status(200).json({
      ok: true,
      mode: isPersonal ? "personal" : "technical",
      shortAnswer: insights.shortAnswer,
      insights
    });

  } catch (err) {
    console.error("SPIRITUAL ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
