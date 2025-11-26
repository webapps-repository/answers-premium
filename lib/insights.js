// /lib/insights.js
// Apple-Style Clean HTML Rendering (Personal + Compatibility)

export function buildSummaryHTML({ question, engines, mode }) {
  // NO more classification visible
  return `
    <div style="font-size:15px; line-height:1.55;">
      <strong>Your Question:</strong> ${question}<br><br>
      ${engines.summary || ""}
    </div>
  `;
}


/* ============================================================
   PERSONAL (Single Person) EMAIL — Apple Style
============================================================ */
function renderPersonalEmail({ question, engines, fullName, birthDate, birthTime, birthPlace }) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding:20px; color:#333;">

    <h1 style="font-size:24px; font-weight:600; margin-bottom:20px;">
      Your Personal Insight Report
    </h1>

    <h3 style="margin-top:20px; margin-bottom:6px;">Your Question</h3>
    <p>${question}</p>

    <h3 style="margin-top:25px;">Personal Details</h3>
    <ul>
      <li><strong>Name:</strong> ${fullName || "—"}</li>
      <li><strong>Date of Birth:</strong> ${birthDate || "—"}</li>
      <li><strong>Time of Birth:</strong> ${birthTime || "—"}</li>
      <li><strong>Place of Birth:</strong> ${birthPlace || "—"}</li>
    </ul>

    <h2 style="margin-top:30px;">In-Depth Analysis</h2>

    <h3 style="margin-top:18px;">Direct Answer</h3>
    <p>${engines.answer}</p>

    <h3 style="margin-top:18px;">Astrology</h3>
    <pre style="white-space:pre-wrap;">${JSON.stringify(engines.astrology, null, 2)}</pre>

    <h3 style="margin-top:18px;">Numerology</h3>
    <pre style="white-space:pre-wrap;">${JSON.stringify(engines.numerology, null, 2)}</pre>

    <h3 style="margin-top:18px;">Palmistry</h3>
    <pre style="white-space:pre-wrap;">${JSON.stringify(engines.palmistry, null, 2)}</pre>

    <h3 style="margin-top:18px;">Combined Insight</h3>
    <pre style="white-space:pre-wrap;">${JSON.stringify(engines.triad, null, 2)}</pre>

  </div>
  `;
}


/* ============================================================
   COMPATIBILITY EMAIL — Apple Style Sectioned Layout
============================================================ */
function renderCompatibilityEmail({ question, p1, p2, compat }) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding:20px; color:#333;">

    <h1 style="font-size:24px; font-weight:600; margin-bottom:20px;">
      Your Compatibility Insight Report
    </h1>

    <h3 style="margin-top:20px;">Your Question</h3>
    <p>${question}</p>

    <!-- PERSON 1 -->
    <h2 style="margin-top:30px;">Person 1</h2>
    <ul>
      <li><strong>Name:</strong> ${p1.fullName || "—"}</li>
      <li><strong>DOB:</strong> ${p1.birthDate || "—"}</li>
      <li><strong>Time:</strong> ${p1.birthTime || "—"}</li>
      <li><strong>Birth Place:</strong> ${p1.birthPlace || "—"}</li>
    </ul>

    <h3>Astrology</h3>
    <pre style="white-space:pre-wrap;">${JSON.stringify(p1.engines.astrology, null, 2)}</pre>

    <h3>Numerology</h3>
    <pre style="white-space:pre-wrap;">${JSON.stringify(p1.engines.numerology, null, 2)}</pre>

    <h3>Palmistry</h3>
    <pre style="white-space:pre-wrap;">${JSON.stringify(p1.engines.palmistry, null, 2)}</pre>

    <hr style="margin:40px 0; border:none; border-top:1px solid #eee;">

    <!-- PERSON 2 -->
    <h2>Person 2</h2>
    <ul>
      <li><strong>Name:</strong> ${p2.fullName || "—"}</li>
      <li><strong>DOB:</strong> ${p2.birthDate || "—"}</li>
      <li><strong>Time:</strong> ${p2.birthTime || "—"}</li>
      <li><strong>Birth Place:</strong> ${p2.birthPlace || "—"}</li>
    </ul>

    <h3>Astrology</h3>
    <pre style="white-space:pre-wrap;">${JSON.stringify(p2.engines.astrology, null, 2)}</pre>

    <h3>Numerology</h3>
    <pre style="white-space:pre-wrap;">${JSON.stringify(p2.engines.numerology, null, 2)}</pre>

    <h3>Palmistry</h3>
    <pre style="white-space:pre-wrap;">${JSON.stringify(p2.engines.palmistry, null, 2)}</pre>

    <hr style="margin:40px 0; border:none; border-top:1px solid #eee;">

    <!-- COMPATIBILITY -->
    <h2>Compatibility Analysis</h2>
    <p>${compat.summary}</p>

    <h3>Detailed Compatibility</h3>
    <pre style="white-space:pre-wrap;">${JSON.stringify(compat.details, null, 2)}</pre>

  </div>
  `;
}


/* ============================================================
   MAIN EXPORT (INTELLIGENT MODE HANDLING)
============================================================ */
export function buildUniversalEmailHTML(data) {
  if (data.mode === "compat") {
    return renderCompatibilityEmail(data);
  }
  return renderPersonalEmail(data);
}
