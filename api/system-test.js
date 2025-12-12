// /api/system-test.js V9 from chatgpt

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function handler(req, res) {
  console.log("🔧 SYSTEM TEST V9 START");

  const base = `https://${req.headers.host}`;

  async function check(path, payload) {
    try {
      const r = await fetch(base + path, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload || { hello: "world" })
      });

      let t = null;
      try {
        t = await r.json();
      } catch {}

      return {
        path,
        status: r.status,
        ok: r.ok,
        statusText: r.statusText,
        response: t
      };
    } catch (err) {
      return { path, error: err + "" };
    }
  }

  const results = {};

  // ---------------------------
  // ROUTE TESTS
  // ---------------------------
  results.detailed_missing_token = await check(
    "/api/detailed-report",
    {}
  );

  results.detailed_fake_token = await check(
    "/api/detailed-report",
    { premiumToken: "fake" }
  );

  results.spiritual = await check(
    "/api/spiritual-report",
    { email: "test@test.com", question: "hi" }
  );

  // ---------------------------
  // FINISH
  // ---------------------------
  console.log("🔧 SYSTEM TEST V9 COMPLETE");
  return res.status(200).json({
    ok: true,
    vercelURL: base,
    timestamp: Date.now(),
    results
  });
}
