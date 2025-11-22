// /lib/pdf.js — Stable Production Renderer

import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import fs from "fs";
import path from "path";

// Load font safely (Vercel OK)
const fontPath = path.join(process.cwd(), "lib/fonts/Inter-Regular.ttf");
let fontData = null;
try {
  fontData = fs.readFileSync(fontPath);
} catch (err) {
  console.error("FONT LOAD ERROR:", err);
  fontData = null;
}

// Sanitize HTML into readable text
function stripHtml(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export async function generatePDFBufferFromHTML(html) {
  const text = stripHtml(html);

  const vnode = {
    type: "div",
    props: {
      style: {
        fontFamily: "Inter",
        fontSize: "17px",
        lineHeight: 1.7,
        padding: "40px",
        color: "#222"
      },
      children: text || "Report content unavailable."
    }
  };

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

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1240 }
  });

  return Buffer.from(resvg.render().asPng());
}
