/* ============================================================
   SHORT SUMMARY (Shopify frontend)
============================================================ */
export function buildSummaryHTML({ question, engines, mode }) {

  if (mode === "compat") {
    return `
      <div style="font-family:system-ui;">
        <p><strong>Your Question:</strong> ${question}</p>
        <p><strong>Your Compatibility Score:</strong> ${engines.compatScore}%</p>
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

/* TABLE ROW HELPER */
function row(label, v1, v2) {
  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e0e0e0;"><strong>${label}</strong></td>
      <td style="padding:10px 12px;border-bottom:1px solid #e0e0e0;">${v1 || "—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e0e0e0;">${v2 || "—"}</td>
    </tr>
  `;
}

/* APPLE-STYLE CARD */
function card(innerHTML) {
  return `
    <div style="
      border:1px solid #ddd;
      border-radius:14px;
      padding:20px;
      background:#fafafa;
      margin-top:30px;
    ">
      ${innerHTML}
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
     COMPATIBILITY MODE (main)
  --------------------------------------------------------- */
  if (mode === "compat") {

    const c = engines.compat || {};

    return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui; padding:26px; color:#222; line-height:1.6;">

  <h1 style="text-align:center;margin:0;">Melodie Says</h1>
  <h2 style="text-align:center;margin-top:6px;">Compatibility Report</h2>

  <h3 style="text-align:center;margin-top:12px;font-size:26px;">
    Compatibility Score: ${compatScore}%
  </h3>

  ${card(`
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <th style="padding:10px 12px;border-bottom:2px solid #000;text-align:left;"></th>
        <th style="padding:10px 12px;border-bottom:2px solid #000;text-align:left;">${compat1.fullName || "Person 1"}</th>
        <th style="padding:10px 12px;border-bottom:2px solid #000;text-align:left;">${compat2.fullName || "Person 2"}</th>
      </tr>

      ${row("Life Path",    c.numerology?.person1?.lifePath,    c.numerology?.person2?.lifePath)}
      ${row("Expression",   c.numerology?.person1?.expression,  c.numerology?.person2?.expression)}
      ${row("Soul Urge",    c.numerology?.person1?.soulUrge,    c.numerology?.person2?.soulUrge)}
      ${row("Maturity",     c.numerology?.person1?.maturity,    c.numerology?.person2?.maturity)}

      ${row("Sun Sign",     c.astrology?.person1?.sun,          c.astrology?.person2?.sun)}
      ${row("Moon Sign",    c.astrology?.person1?.moon,         c.astrology?.person2?.moon)}
      ${row("Rising Sign",  c.astrology?.person1?.rising,       c.astrology?.person2?.rising)}

      ${row("Life Line",    c.palmistry?.person1?.life,         c.palmistry?.person2?.life)}
      ${row("Head Line",    c.palmistry?.person1?.head,         c.palmistry?.person2?.head)}
      ${row("Heart Line",   c.palmistry?.person1?.heart,        c.palmistry?.person2?.heart)}
    </table>
  `)}

  <h3 style="margin-top:35px;">Summary</h3>
  <p>${c.summary || ""}</p>

  <h3 style="margin-top:25px;">Strengths</h3>
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
     PERSONAL MODE
  --------------------------------------------------------- */
  return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui; padding:26px; color:#222; line-height:1.6;">

  <h1 style="text-align:center;">Melodie Says</h1>
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
</html>`;
}
