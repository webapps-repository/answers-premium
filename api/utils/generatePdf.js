// /api/utils/generatePdf.js
import PDFDocument from "pdfkit";
import getStream from "get-stream";

export async function generatePdfBuffer({
  fullName,
  birthdate,
  birthTime,
  birthPlace,
  question,
  answer,
  astrology,
  numerology,
  palmistry,
}) {
  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", () => console.log("✅ PDF generation complete"));

  // === Header ===
  doc
    .fontSize(22)
    .fillColor("#4B0082")
    .text("🔮 Personal Spiritual Report", { align: "center" })
    .moveDown(1.5);

  // === Personal Details ===
  doc
    .fontSize(14)
    .fillColor("#000")
    .text(`👤 Name: ${fullName}`)
    .text(`📅 Birth Date: ${birthdate}`)
    .text(`⏰ Birth Time: ${birthTime || "Unknown"}`)
    .text(`🌍 Birth Place: ${birthPlace}`)
    .text(`💭 Question: ${question || "No question provided."}`)
    .moveDown(1.2);

  const divider = (title, color = "#4B0082") => {
    doc
      .fontSize(16)
      .fillColor(color)
      .text(title, { underline: true })
      .moveDown(0.6);
  };

  // === User Question Answer ===
  divider("💫 Answer to Your Question");
  doc
    .fontSize(12)
    .fillColor("#333")
    .text(answer || "No answer was generated.", { align: "left" })
    .moveDown(1.2);

  // === Astrology Section ===
  divider("🌟 Astrology Report");
  doc
    .fontSize(12)
    .fillColor("#333")
    .text(
      "Astrology reflects your celestial blueprint — a map of the sky at the exact moment of your birth. The chart below outlines your Sun, Moon, Rising Sign, and Ruling Planet, followed by a detailed reading that interprets how these factors shape your life and answer your question.",
      { align: "left" }
    )
    .moveDown(1);

  // --- Subsections ---
  doc
    .fontSize(13)
    .fillColor("#4B0082")
    .text("☀️ The Sun", { underline: true })
    .fontSize(12)
    .fillColor("#333")
    .text(
      "The Sun reflects your core identity, motivations, and willpower. Its sign reveals the way you express yourself, while its house shows where you can best embody your true self.",
      { align: "left" }
    )
    .moveDown(0.8);

  doc
    .fontSize(13)
    .fillColor("#4B0082")
    .text("🌙 The Moon", { underline: true })
    .fontSize(12)
    .fillColor("#333")
    .text(
      "The Moon governs your emotions, instincts, and inner world. Its sign determines how you experience and express feelings, and its house shows where you seek emotional security.",
      { align: "left" }
    )
    .moveDown(0.8);

  doc
    .fontSize(13)
    .fillColor("#4B0082")
    .text("🌅 The Rising Sign (Ascendant)", { underline: true })
    .fontSize(12)
    .fillColor("#333")
    .text(
      "Your Ascendant represents your outer personality — the face you show to the world. It describes how others perceive you and your initial approach to new situations.",
      { align: "left" }
    )
    .moveDown(0.8);

  doc
    .fontSize(13)
    .fillColor("#4B0082")
    .text("🪐 The Ruling Planet", { underline: true })
    .fontSize(12)
    .fillColor("#333")
    .text(
      "The Ruling Planet governs your Ascendant and defines the tone of your chart. It influences your personal style, motivations, and life path. The sign and house it occupies reveal where and how you express leadership and power.",
      { align: "left" }
    )
    .moveDown(1);

  // --- Ruling Planet Reference Table ---
  doc
    .fontSize(12)
    .fillColor("#333")
    .text("Rising Sign and Ruling Planet Reference:", { underline: true })
    .moveDown(0.3);

  const rulingPlanets = [
    ["Aries", "Impetuous, strong-willed", "Mars"],
    ["Taurus", "Stable, sensuous", "Venus"],
    ["Gemini", "Verbal, high-strung", "Mercury"],
    ["Cancer", "Emotional, responsive", "Moon"],
    ["Leo", "Confident, exuberant", "Sun"],
    ["Virgo", "Methodical, discerning", "Mercury"],
    ["Libra", "Charming, appealing", "Venus"],
    ["Scorpio", "Controlled, reserved", "Pluto and/or Mars"],
    ["Sagittarius", "Cosmopolitan, irrepressible", "Jupiter"],
    ["Capricorn", "Respectable, proud", "Saturn"],
    ["Aquarius", "Friendly, individualistic", "Uranus and/or Saturn"],
    ["Pisces", "Idealistic, receptive", "Neptune and/or Jupiter"],
  ];

  rulingPlanets.forEach(([sign, traits, ruler]) => {
    doc.fontSize(10).fillColor("#444").text(`${sign}: ${traits} — Ruling Planet: ${ruler}`);
  });
  doc.moveDown(1.2);

  // --- Interpretation ---
  doc
    .fontSize(13)
    .fillColor("#4B0082")
    .text("🧭 Astrological Interpretation", { underline: true })
    .fontSize(12)
    .fillColor("#333")
    .text(
      astrology ||
        "No astrological analysis generated. Ensure OpenAI data was passed correctly.",
      { align: "left" }
    )
    .moveDown(1.5);

  // === Numerology Section ===
  divider("🔢 Numerology Insights");
  doc
    .fontSize(12)
    .fillColor("#333")
    .text(
      numerology ||
        "Numerology analysis unavailable. Check if OpenAI returned data properly.",
      { align: "left" }
    )
    .moveDown(1.2);

  // === Palmistry Section ===
  divider("✋ Palmistry Insights");
  doc
    .fontSize(12)
    .fillColor("#333")
    .text(
      palmistry ||
        "Palmistry reading unavailable. Ensure palm data was processed correctly.",
      { align: "left" }
    )
    .moveDown(2);

  // === Footer ===
  doc
    .fontSize(10)
    .fillColor("#777")
    .text(
      "✨ Generated by Hazcam Spiritual Systems — combining astrology, numerology, and palmistry for a holistic insight.",
      { align: "center" }
    );

  doc.end();
  return await getStream.buffer(doc);
}
