/* ============================================================
   SHORT SUMMARY (Shopify frontend)
============================================================ */
export function buildSummaryHTML({ question, engines, mode }) {

  if (mode === "compat") {
    const compatScore = engines.compatScore || 0;

    return `
      <div style="font-family:system-ui;">
        <p><strong>Your Question:</strong> ${question}</p>
        <p><strong>Your Compatibility Score:</strong> ${compatScore}%</p>
        <p>${engines.compat?.summary || ""}</p>
      </div>
    `;
  }

  return `
    <div style="font-family:system-ui;">
      <p><strong>Your Question:</strong> ${question}</p>
      <p>${engines.summary}</p>
    </div>
  `;
}

/* ============================================================
   INTERNAL HELPERS
============================================================ */
function row(label, val1, val2) {
  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e0e0e0;"><strong>${label}</strong></td>
      <td style="padding:10px 12px;border-bottom:1px solid #e0e0e0;">${val1 || "—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e0e0e0;">${val2 || "—"}</td>
    </tr>
  `;
}

/* Apple-style wrapper */
function card(inner) {
  return `
    <div style="
      border:1px solid #ddd;
      border-radius:14px;
      padding:20px;
      margin-top:25px;
      background:#fafafa;
    ">
      ${inner}
    </div>
  `;
}

/* ============================================================
   FULL EMAIL BUILDER
============================================================ */
export function buildUniversalEmailHTML(opts) {
  const {
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

    const comp = engines.compat || {};

    return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui; padding:26px; color:#222; line-height:1.6;">

  <h1 style="text-align:center;margin:0;">Melodie Says</h1>
  <h2 style="text-align:center;margin-top:6px;">Compatibility Report</h2>

  <!-- SCORE -->
  <div style="text-align:center;margin-top:18px;">
    <div style="
      font-size:26px;
      font-weight:700;
      padding:12px 0;
    ">
      Compatibility Score: ${compatScore}%
    </div>
  </div>

  <!-- APPLE-STYLE COMPARISON CARD -->
  ${card(`
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <th style="padding:10px 12px;border-bottom:2px solid #000;text-align:left;"></th>
        <th style="padding:10px 12px;border-bottom:2px solid #000;text-align:left;">${compat1.fullName || "Person 1"}</th>
        <th style="padding:10px 12px;border-bottom:2px solid #000;text-align:left;">${compat2.fullName || "Person 2"}</th>
      </tr>

      ${row("Life Path",        comp.num_lifePath1,     comp.num_lifePath2)}
      ${row("Expression",       comp.num_expression1,   comp.num_expression2)}
      ${row("Soul Urge",        comp.num_soulUrge1,     comp.num_soulUrge2)}
      ${row("Personality",      comp.num_personality1,  comp.num_personality2)}

      ${row("Sun Sign",         comp.astro_sun1,        comp.astro_sun2)}
      ${row("Moon Sign",        comp.astro_moon1,       comp.astro_moon2)}
      ${row("Rising Sign",      comp.astro_rising1,     comp.astro_rising2)}

      ${row("Life Line",        comp.palm_life1,        comp.palm_life2)}
      ${row("Head Line",        comp.palm_head1,        comp.palm_head2)}
      ${row("Heart Line",       comp.palm_heart1,       comp.palm_heart2)}

      ${row("Core Compatibility", comp.coreCompatibility, "")}
    </table>
  `)}

  <!-- SUMMARY SECTIONS -->
  <h3 style="margin-top:35px;">Summary</h3>
  <p>${comp.summary || ""}</p>

  <h3 style="margin-top:30px;">Strengths</h3>
  <p>${comp.strengths || ""}</p>

  <h3 style="margin-top:25px;">Challenges</h3>
  <p>${comp.challenges || ""}</p>

  <h3 style="margin-top:25px;">Overall Insight</h3>
  <p>${comp.overall || ""}</p>

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
<body style="font-family:system-ui; padding:26px; color:#222; line-height:1.6;">

  <h1 style="text-align:center;margin:0;">Melodie Says</h1>
  <h2 style="text-align:center;margin-top:6px;">Your Personal Insight Report</h2>

  <h3>Your Question</h3>
  <p>${question}</p>

  <h3>Your Details</h3>
  <ul>
    <li><strong>Name:</strong> ${fullName || "—"}</li>
    <li><strong>DOB:</strong> ${birthDate || "—"}</li>
    <li><strong>Time:</strong> ${birthTime || "—"}</li>
    <li><strong>Birth Place:</strong> ${birthPlace || "—"}</li>
  </ul>

  <h3 style="margin-top:25px;">Astrology</h3>
  <p>${engines.astrology.summary}</p>

  <h3 style="margin-top:25px;">Numerology</h3>
  <p>${engines.numerology.summary}</p>

  <h3 style="margin-top:25px;">Palmistry</h3>
  <p>${engines.palmistry.summary}</p>

  <h3 style="margin-top:25px;">Combined Insight</h3>
  <p>${engines.triad.summary}</p>

</body>
</html>
`;
}
