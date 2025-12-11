// /api/openai-test.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { runAllEngines } from "../lib/engines.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Not allowed" });
  }

  try {
    const out = await runAllEngines({
      question: "test",
      mode: "personal",
      uploadedFile: null,
      compat1: null,
      compat2: null,
      palm1File: null,
      palm2File: null,
    });

    return res.status(200).json({
      ok: true,
      sample: out?.directAnswer ?? null,
    });
  } catch (err) {
    console.error("❌ OPENAI-TEST ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: String(err?.message || err),
    });
  }
}

