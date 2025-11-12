// /api/selftest.js
// Performs environment + integration tests: OpenAI, Resend, PDF, Numerology, JSON validity.
// /api/selftest.js
// /api/selftest.js
// /api/selftest.js

import OpenAI from "openai";
import { Resend } from "resend";
import { generatePdfBuffer } from "./utils/generatePdf.js";

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  try {
    // --- CORS ---
    const allowed = ["https://zzqejx-u8.myshopify.com", "https://answers-rust.vercel.app"];
    const origin = req.headers.origin || "";
    res.setHeader("Access-Control-Allow-Origin", allowed.includes(origin) ? origin : allowed[0]);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") return res.status(200).end();

    const results = [];
    const add = (n, ok, d = "") => results.push({ name: n, ok, detail: d });
    const start = Date.now();

    const resendKey = process.env.RESEND_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const testEmail = process.env.TEST_EMAIL || "test@example.com";

    add("Resend API Key", !!resendKey, resendKey ? "Found" : "Missing");
    add("OpenAI API Key", !!openaiKey, openaiKey ? "Found" : "Missing");

    const resend = resendKey ? new Resend(resendKey) : null;
    const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

    // --- OpenAI test ---
    try {
      if (openai) {
        const r = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Return PASS" }],
        });
        const out = r.choices?.[0]?.message?.content?.trim() || "";
        add("OpenAI Chat Test", out.includes("PASS"), out);
      } else add("OpenAI Chat Test", false, "Missing key");
    } catch (e) {
      add("OpenAI Chat Test", false, e.message);
    }

    // --- Numerology ---
    const dob = "13-03-1960", name = "Test User";
    const map = {A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8};
    const reduce = n => { while(n>9&&![11,22,33].includes(n)) n=String(n).split("").reduce((a,b)=>a+(+b||0),0); return n; };
    const life = reduce([...dob.replace(/\D/g,"")].reduce((a,b)=>a+(+b||0),0));
    const expr = reduce([...name.toUpperCase()].reduce((a,c)=>a+(map[c]||0),0));
    add("Local Numerology", life > 0 && expr > 0, `Life=${life}, Expr=${expr}`);

    // --- PDF ---
    let pdf = null;
    try {
      pdf = await generatePdfBuffer({
        headerBrand: "Melodies Web",
        title: "System Test Report",
        mode: "technical",
        question: "Diagnostic Check",
        answer: "✅ PDF OK",
        numerologyPack: { lifePath: life, expression: expr },
      });
      add("PDF Generation", Buffer.isBuffer(pdf) && pdf.length > 1000, `Bytes=${pdf?.length}`);
    } catch (e) {
      add("PDF Generation", false, e.message);
    }

    // --- Email (Resend) ---
    try {
      if (resend) {
        await resend.emails.send({
          from: "Melodies Web <noreply@melodiesweb.app>",
          to: testEmail,
          subject: "✅ Melodies Web Self-Test",
          html: `<p>All systems operational at ${new Date().toLocaleString()}.</p>`,
          attachments: [{ filename: "SelfTest.pdf", content: pdf.toString("base64") }],
        });
        add("Email Sending (Resend)", true, `Sent to ${testEmail}`);
      } else add("Email Sending (Resend)", false, "RESEND_API_KEY missing");
    } catch (e) {
      add("Email Sending (Resend)", false, e.message);
    }

    // --- JSON validity ---
    const valid = results.every(r => typeof r.ok === "boolean" && r.name);
    add("JSON Output Integrity", valid, valid ? "Valid JSON" : "Invalid JSON");

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    return res.status(200).json({
      success: true,
      duration: `${duration}s`,
      summary: `${results.filter(r => r.ok).length}/${results.length} checks passed`,
      results,
    });
  } catch (err) {
    console.error("❌ Selftest crash:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
