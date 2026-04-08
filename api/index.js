// @ts-nocheck
export default async function handler(req, res) {
  try {
    const { default: app } = await import("../artifacts/api-server/dist/app.mjs");
    return app(req, res);
  } catch (err) {
    console.error("Vercel Function Initialization Error:", err);
    res.status(500).json({ error: "Vercel Init Crash: " + err.message, stack: err.stack });
  }
}
