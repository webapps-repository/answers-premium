/* ============================================================
   SUMMARY HTML (short answer for website)
============================================================ */
export function buildSummaryHTML({ classification, engines, question }) {
  return `
    <div style="font-size:15px; line-height:1.55; color:#222;">
      <div><b>Your Question:</b> ${question}</div>
      <div style="margin-top:10px;">
        <b>Classification:</b> ${classification?.type || "unknown"}  
        (${Math.round((classification?.confidence || 0) * 100)}% confidence)
      </div>
      <div style="margin-top:12px; white-space:pre-wrap;">
        ${engines?.summary || "No summary available."}
      </div>
    </div>
  `;
}

/* ============================================================
   PERSONAL EMAIL HTML (legacy, still needed)
============================================================ */
export function buildPersonalEmailHTML({
  question,
  engines,
  fullName,
  birthDate,
  birthTime,
  birthPlace
}) {
  return buildUniversalEmailHTML({
    title: "Your Personal Insight Report",
    question,
    engines,
    fullName,
    birthDate,
    birthTime,
    birthPlace
  });
}

/* ============================================================
   TECHNICAL EMAIL HTML (legacy - still supported)
============================================================ */
export function buildTechnicalEmailHTML({ question, engines }) {
  return buildUniversalEmailHTML({
    title: "Your Technical Insight Report",
    question,
    engines
  });
}

/* ============================================================
   MAIN INSIGHT ENGINE (required by all API endpoints)
============================================================ */
import { completeJson } from "../lib/ai.js";
import { analyzePalm } from "../lib/engines.js";   // only used if palm uploaded

export async function generateInsights({ question, mode, fullName, birthDate, birthTime, birthPlace, palmImage }) {
  const payload = {
    question,
    fullName,
    birthDate,
    birthTime,
    birthPlace,
    mode
  };

  let palm = null;

  if (palmImage) {
    try {
      palm = await analyzePalm(palmImage);
    } catch (e) {
      palm = { error: "Palm analysis failed", detail: String(e) };
    }
  }

  // main insight request
  const ai = await completeJson(`
    Return STRICT JSON ONLY.

    {
      "summary": string,
      "analysis": string
    }

    User Question: ${question}
    User Mode: ${mode}
    User Details: ${JSON.stringify(payload, null, 2)}
    Palm Result: ${JSON.stringify(palm, null, 2)}
  `);

  return {
    summary: ai.summary || "",
    analysis: ai.analysis || "",
    palm
  };
}

/* ============================================================
   UNIVERSAL EMAIL HTML (Apple-style)
============================================================ */
export function buildUniversalEmailHTML({
  title = "Your Insight Report",
  question = "",
  engines = {},
  fullName = "",
  birthDate = "",
  birthTime = "",
  birthPlace = ""
}) {
  const pretty = JSON.stringify(engines, null, 2);

  return `
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 24px;
      background: #f7f7f9;
      color: #222;
    ">
      <div style="
        max-width: 720px;
        background: #ffffff;
        margin: auto;
        padding: 32px;
        border-radius: 14px;
        box-shadow: 0px 4px 18px rgba(0,0,0,0.06);
      ">

        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 10px;">
          ${title}
        </h1>

        <h2 style="font-size:18px; margin-bottom:6px;">Your Question</h2>
        <div style="
          background:#f2f2f5;
          padding:12px 16px;
          border-radius:10px;
          margin-bottom:22px;
          white-space:pre-wrap;
        ">${question}</div>

        ${
          fullName || birthDate || birthTime || birthPlace
            ? `
              <h2 style="font-size:18px; margin-bottom:6px;">Personal Details</h2>
              <ul style="padding-left:16px; margin-bottom:20px; color:#444; font-size:14px;">
                ${fullName ? `<li><b>Name:</b> ${fullName}</li>` : ""}
                ${birthDate ? `<li><b>Date of Birth:</b> ${birthDate}</li>` : ""}
                ${birthTime ? `<li><b>Time of Birth:</b> ${birthTime}</li>` : ""}
                ${birthPlace ? `<li><b>Place of Birth:</b> ${birthPlace}</li>` : ""}
              </ul>
            `
            : ""
        }

        <h2 style="font-size:18px; margin-bottom:6px;">In-Depth Analysis</h2>
        <div style="
          background:#f8f7ff;
          padding:16px;
          border-radius:12px;
          white-space:pre-wrap;
          font-size:14px;
          line-height:1.48;
        ">
${pretty}
        </div>

        <p style="margin-top:28px; font-size:13px; color:#777;">
          This report was generated automatically.
        </p>

      </div>
    </div>
  `;
}
