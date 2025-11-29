/* ============================================================
   SHORT SUMMARY (Shopify frontend)
============================================================ */
export function buildSummaryHTML({ question, engines, mode }) {

  if (mode === "compat") {
    const score = engines.compatScore || 0;

    return `
      <div style="font-family:system-ui;">
        <p><strong>Your Question:</strong> ${question}</p>
        <p><strong>Your Compatibility Score:</strong> ${score}%</p>
        <p>${engines.compat?.summary || ""}</p>
      </div>
    `;
  }

  return `
    <div style="font-family:system-ui;">
      <p><strong>Your Question:</strong> ${question}</p>
      <p><strong>Answer:</strong> ${engines.directAnswer}</p>
      <p>${engines.summary}</p>
    </div>
  `;
}

/* helpers */
function row(label, v1, v2) {
  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;"><strong>${label}</strong></td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;">${v1 || "—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;">${v2 || "—"}</td>
    </tr>
  `;
}

function card(inner) {
  return `
    <div style="
      border:1px solid #ddd;
      border-radius:14px;
      padding:22px;
      margin-top:26px;
      background:#fafafa;
    ">
      ${inner}
    </div>
  `;
}

/* ============================================================
   EMAIL BUILDER
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
    const c = engines.compat;

    return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui;padding:26px;line-height:1.65;color:#222;">

<h1 style="text-align:center;margin:0;">Melodie Says</h1>
<h2 style="text-align:center;margin-top:4px;">Compatibility Report</h2>

<h3>Your Question</h3>
<p>${question}</p>

<h3>Answer</h3>
<p><strong>${c.answerToQuestion}</strong></p>

<h3>Reason</h3>
<p>${c.reasoning}</p>

<div style="text-align:center;font-size:26px;font-weight:700;margin-top:20px;">
  Compatibility Score: ${compatScore}%
</div>

${card(`
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <th style="padding:10px 12px;border-bottom:2px solid #000;"></th>
      <th style="padding:10px 12px;border-bottom:2px solid #000;">${compat1.fullName || "Person 1"}</th>
      <th style="padding:10px 12px;border-bottom:2px solid #000;">${compat2.fullName || "Person 2"}</th>
    </tr>

    ${row("Life Path", c.num_lifePath1, c.num_lifePath2)}
    ${row("Expression", c.num_expression1, c.num_expression2)}
    ${row("Soul Urge", c.num_soulUrge1, c.num_soulUrge2)}
    ${row("Personality", c.num_personality1, c.num_personality2)}

    ${row("Sun Sign", c.astro_sun1, c.astro_sun2)}
    ${row("Moon Sign", c.astro_moon1, c.astro_moon2)}
    ${row("Rising Sign", c.astro_rising1, c.astro_rising2)}

    ${row("Life Line", c.palm_life1, c.palm_life2)}
    ${row("Head Line", c.palm_head1, c.palm_head2)}
    ${row("Heart Line", c.palm_heart1, c.palm_heart2)}

    ${row("Core Compatibility", c.coreCompatibility, "")}
  </table>
`)}

<h3 style="margin-top:35px;">Strengths</h3>
<p>${c.strengths || ""}</p>

<h3 style="margin-top:25px;">Challenges</h3>
<p>${c.challenges || ""}</p>

<h3 style="margin-top:25px;">Overall Insight</h3>
<p>${c.overall || ""}</p>

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
<body style="font-family:system-ui;padding:26px;line-height:1.65;color:#222;">

<h1 style="text-align:center;margin:0;">Melodie Says</h1>
<h2 style="text-align:center;margin-top:4px;">Your Personal Insight Report</h2>

<h3>Your Question</h3>
<p>${question}</p>

<h3>Answer</h3>
<p><strong>${engines.directAnswer}</strong></p>

<h3>Reason</h3>
<p>${engines.summary}</p>

<h3>Your Details</h3>
<ul>
  <li><strong>Name:</strong> ${fullName || "—"}</li>
  <li><strong>DOB:</strong> ${birthDate || "—"}</li>
  <li><strong>Time:</strong> ${birthTime || "—"}</li>
  <li><strong>Birth Place:</strong> ${birthPlace || "—"}</li>
</ul>

<h3>Astrology</h3>
<p>${engines.astrology.summary}</p>

<h3>Numerology</h3>
<p>${engines.numerology.summary}</p>

<h3>Palmistry</h3>
<p>${engines.palmistry.summary}</p>

<h3>Combined Insight</h3>
<p>${engines.triad.summary}</p>

</body>
</html>
`;
}
