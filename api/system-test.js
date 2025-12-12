// /api/system-test.js V8 from chatgpt

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function handler(req, res) {
  const pathTest = async (path) => {
    try {
      const r = await fetch(`https://${process.env.VERCEL_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });

      return {
        path,
        status: r.status,
        ok: r.ok,
        statusText: r.statusText
      };
    } catch (err) {
      return { path, error: err.message };
    }
  };

  const results = {
    vercelURL: process.env.VERCEL_URL,
    timestamp: Date.now(),
    routes: {
      spiritual: await pathTest("/api/spiritual-report"),
      detailed: await pathTest("/api/detailed-report"),
      email: await pathTest("/api/email-test")
    }
  };

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  res.status(200).json(results);
}

