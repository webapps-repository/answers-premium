// /lib/insights.js — Updated for compatibility score in short summary

/* ============================================================
   SHORT SUMMARY (for Shopify display)
============================================================ */
export function buildSummaryHTML({ question, engines, mode, compatScore }) {

  // COMPATIBILITY SHORT ANSWER (front-end box)
  if (mode === "compat") {
    const score = compatScore ?? engines.compatScore ?? 0;

    return `
      <div style="font-family:system-ui;">
        <p><strong>Your Question:</strong> ${question}</p>

        <p><strong>Your Compatibility Score:</strong> ${score}%</p>

        <h4>Your Compatibility</h4>
        <p>${engines.summary}</p>
      </div>
    `;
  }

  // PERSONAL SUMMARY
  return `
    <div style="font-family:system-ui;">
      <p><strong>Your Question:</strong> ${question}</p>
      <p>${engines.summary}</p>
    </div>
  `;
}

/* ============================================================
   SPEEDOMETER (SVG Gauge)
============================================================ */
export function renderCompatibilityGauge(score) {
  const angle = 180 * (score / 100);

  return `
  <div style="text-align:center;margin:20px 0;">
    <svg width="240" height="140">
      <path d="M20 120 A100 100 0 0 1 220 120" fill="none" stroke="#ddd" stroke-width="14"/>
      <line x1="120" y1="120"
            x2="${120 + 90 * Math.cos(Math.PI - angle * Math.PI / 180)}"
            y2="${120 + 90 * Math.sin(Math.PI - angle * Math.PI / 180)}"
            stroke="#6c63ff" stroke-width="8" stroke-linecap="round"/>
      <text x="120" y="135" text-anchor="middle"
            font-size="22" font-family="system-ui"
            fill="#333">${score}%</text>
    </svg>
  </div>
  `;
}

/* ============================================================
   PERSON BLOCK
============================================================ */
function personBlock(label, p) {
  return `
    <h3 style="margin-top:30px;">${label}</h3>
    <ul>
      <li><strong>Name:</strong> ${p.fullName || "—"}</li>
      <li><strong>DOB:</strong> ${p.birthDate || "—"}</li>
      <li><strong>Time:</strong> ${p.birthTime || "—"}</li>
      <li><strong>Birth Place:</strong> ${p.birthPlace || "—"}</li>
    </ul>
  `;
}

/* ============================================================
   SECTION (Astrology, Numerology, Palmistry)
============================================================ */
function section(title, dataObj) {
  if (!dataObj) return "";

  const rows = Object.entries(dataObj)
    .filter(([k]) => k !== "summary")
    .map(([k, v]) => `<p><strong>${k}:</strong> ${v}</p>`)
    .join("");

  return `
    <h3 style="margin-top:25px;">${title}</h3>
    <p>${dataObj.summary}</p>
    ${rows}
  `;
}

/* ============================================================
   FULL EMAIL BUILDER
============================================================ */
export function buildUniversalEmailHTML(opts) {
  const {
    title,
    question,
    engines,
    fullName,
    birthDate,
    birthTime,
    birthPlace,
    mode,
    compat1,
    compat2,
    compatScore
  } = opts;

  /* ---------------------------------------------------------
     COMPATIBILITY VERSION
  --------------------------------------------------------- */
  if (mode === "compat") {
    return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui; padding:20px; color:#222;">
  <h1 style="text-align:center;">Melodie Says</h1>
  <h2 style="margin-top:0;text-align:center;">Your Compatibility Insight Report</h2>

  ${renderCompatibilityGauge(compatScore)}

  <h2>Your Question</h2>
  <p>${question}</p>

  ${personBlock("Person 1", compat1)}

  ${section("Astrology (Person 1)", engines.astrology)}
  ${section("Numerology (Person 1)", engines.numerology)}
  ${section("Palmistry (Person 1)", engines.palmistry)}

  <hr style="margin:40px 0;">

  ${personBlock("Person 2", compat2)}

  <h3 style="margin-top:20px;">Combined Insight</h3>
  <p>${engines.compat?.overall || engines.triad?.combinedInsight || ""}</p>

  <p><strong>Strengths:</strong> ${engines.compat?.strengths || ""}</p>
  <p><strong>Challenges:</strong> ${engines.compat?.challenges || ""}</p>

</body>
</html>
    `;
  }

  /* ---------------------------------------------------------
     PERSONAL VERSION
  --------------------------------------------------------- */
  return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui; padding:20px; color:#222;">

  <h1 style="text-align:center;">Melodie Says</h1>
  <h2 style="text-align:center;">Your Personal Insight Report</h2>

  <h2>Your Question</h2>
  <p>${question}</p>

  <h3>Your Details</h3>
  <ul>
    <li><strong>Name:</strong> ${fullName || "—"}</li>
    <li><strong>DOB:</strong> ${birthDate || "—"}</li>
    <li><strong>Time:</strong> ${birthTime || "—"}</li>
    <li><strong>Birth Place:</strong> ${birthPlace || "—"}</li>
  </ul>

  ${section("Astrology", engines.astrology)}
  ${section("Numerology", engines.numerology)}
  ${section("Palmistry", engines.palmistry)}

  <h3 style="margin-top:25px;">Your Combined Insight</h3>
  <p>${engines.triad?.summary || ""}</p>
  <p><strong>Shadow:</strong> ${engines.triad?.shadow || ""}</p>
  <p><strong>Growth:</strong> ${engines.triad?.growth || ""}</p>

</body>
</html>
  `;
}
