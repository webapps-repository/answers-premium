// /lib/pdf.js — Playwright HTML → PDF engine

import { chromium } from "playwright";

export async function generatePDFBufferFromHTML(html) {
  // Launch headless Chromium in Vercel-compatible mode
  const browser = await chromium.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ],
    headless: true
  });

  const page = await browser.newPage();

  // Load HTML into a standalone page
  await page.setContent(html, {
    waitUntil: "networkidle"
  });

  // Generate PDF
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      right: "15mm",
      bottom: "20mm",
      left: "15mm"
    }
  });

  await browser.close();
  return pdfBuffer;
}
