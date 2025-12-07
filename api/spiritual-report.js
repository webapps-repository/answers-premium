// /api/spiritual-report.js

import { generateInsights } from "../lib/insights.js";

function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Requested-With"
  );
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
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;

    const {
      fullName,
      email,
      dateOfBirth,
      timeOfBirth,
      birthPlace,
      latitude,
      longitude,
      gender,
      question,
    } = body || {};

    if (!fullName || !email || !dateOfBirth) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields: fullName, email, dateOfBirth.",
      });
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

    const insights = await generateInsights({
      person,
      question,
      // No palmistry image here – this is lightweight.
    });

    // Return only a compact summary to the frontend.
    res.status(200).json({
      ok: true,
      data: {
        person: insights.person,
        numerology: insights.numerology.coreNumbers,
        astrology: {
          sunSign: insights.astrology.natal?.sunSign,
          moonSign: insights.astrology.natal?.moonSign,
          risingSign: insights.astrology.natal?.risingSign,
        },
        meta: insights.meta,
      },
    });
  } catch (err) {
    console.error("spiritual-report error:", err);
    res.status(500).json({
      ok: false,
      error: "Unexpected server error generating spiritual report.",
    });
  }
}
