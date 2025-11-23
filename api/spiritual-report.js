// /api/spiritual-report.js
import formidable from "formidable";
import { getShortAnswer, generateFullInsights } from "../lib/insights.js";
import { sendHtmlEmail } from "../lib/utils.js";

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable({ multiples: false });

    const data = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    const {
      name,
      email,
      dob,
      gender,
      country,
      state,
      question
    } = data.fields;

    // Short visible answer
    const shortAnswer = await getShortAnswer(question);

    // Long-form insights for HTML email
    const fullInsights = await generateFullInsights({
      name,
      dob,
      gender,
      country,
      state,
      question
    });

    // Build HTML email
    const htmlContent = `
      <div style="font-family:Arial, sans-serif; padding:20px;">
        <h2>Your Personal Spiritual Report</h2>

        <p style="font-size:16px;">Hi ${name || "there"},</p>

        <p style="font-size:15px;">
          Here is your personal spiritual report based on your submitted information.
        </p>

        <h3>Short Answer</h3>
        <div style="background:#f4f4ff; padding:15px; border-radius:8px; margin-bottom:25px;">
          ${shortAnswer}
        </div>

        <h3>Full Insights</h3>
        <div style="line-height:1.6; font-size:15px;">
          ${fullInsights}
        </div>

        <br><br>
        <p style="font-size:13px;color:#888;">
          You are receiving this because you requested a personal spiritual reading.
        </p>
      </div>
    `;

    // Send email through resend
    await sendHtmlEmail({
      to: email,
      subject: "Your Personal Spiritual Report",
      html: htmlContent
    });

    return res.status(200).json({
      ok: true,
      message: "Email sent",
      shortAnswer
    });

  } catch (err) {
    console.error("SPIRITUAL ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
