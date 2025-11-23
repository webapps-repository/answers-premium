// /lib/pdf.js — Puppeteer-Core + Sparticuz Chromium (Vercel Compatible)

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function generatePDFBufferFromHTML(html) {
  try {
    const executablePath = await chromium.executablePath();

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm"
      }
    });

    await browser.close();
    return buffer;

  } catch (err) {
    console.error("PDF GENERATION ERROR:", err);
    throw err;
  }
}
