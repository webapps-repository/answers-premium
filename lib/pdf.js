// /lib/pdf.js — FINAL PRODUCTION VERSION (Stable Stage 3)

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

/* ============================================================
   LOAD FONT — prevent Vercel relative path issues
============================================================ */
const fontPath = path.join(process.cwd(), "lib", "fonts", "Inter-Regular.ttf");
let fontData = null;

try {
  fontData = fs.readFileSync(fontPath);
} catch (err) {
  console.error("❌ Failed to load Inter-Regular.ttf:", err);
  fontData = null;
}

/* ============================================================
   LIGHTWEIGHT HTML → TEXT CONVERTER
============================================================ */
function htmlToPlain(html = "") {
  if (!html) return "";

  return html
    .replace(/<h1[^>]*>/gi, "\n# ")
    .replace(/<h2[^>]*>/gi, "\n## ")
    .replace(/<h3[^>]*>/gi, "\n### ")
    .replace(/<\/h[1-3]>/gi, "\n\n")

    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")

    .replace(/<[^>]+>/g, "")   // remove all remaining tags

    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ============================================================
   GENERATE PDF AS BUFFER (PNG conversion)
============================================================ */
export async function generatePDFBufferFromHTML(html) {
  const text = htmlToPlain(html);

  // Satori virtual DOM node
  const vnode = {
    type: "div",
    props: {
      style: {
        fontFamily: "Inter",
        fontSize: "16px",
        lineHeight: "1.6",
        width: "100%",
        padding: "40px",
        color: "#222",
        background: "#ffffff",
        whiteSpace: "pre-wrap"
      },
      children: text
    }
  };

  // Generate SVG using Satori
  const svg = await satori(vnode, {
    width: 1240,
    height: 1754,
    fonts: fontData
      ? [
          {
            name: "Inter",
            data: fontData,
            weight: 400,
            style: "normal"
          }
        ]
      : []
  });

  // Convert SVG → PNG → Buffer
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1240 }
  });

  const pngData = resvg.render().asPng();
  return Buffer.from(pngData);
}
