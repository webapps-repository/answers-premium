// /lib/pdf.js
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

const fontPath = path.join(process.cwd(), "lib/fonts/Inter-Regular.ttf");
const fontData = fs.readFileSync(fontPath);

// Convert HTML markup → plain text so Satori can render
function htmlToText(html) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generatePDFBufferFromHTML(html) {
  const text = htmlToText(html);

  // Node-safe Satori VNode (NO JSX)
  const vnode = {
    type: "div",
    props: {
      style: {
        fontFamily: "Inter",
        fontSize: "16px",
        padding: "40px",
        lineHeight: "1.6",
        width: "100%",
        color: "#222",
        background: "#fff"
      },
      children: text
    }
  };

  const svg = await satori(vnode, {
    width: 1240,
    height: 1754,
    fonts: [
      {
        name: "Inter",
        data: fontData,
        weight: 400,
        style: "normal"
      }
    ]
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1240 }
  });

  return resvg.render().asPng();
}
