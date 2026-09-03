// @ts-nocheck
import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

/**
 * POST /api/ai/proxy-chat
 * Server-side AI proxy to bypass browser CORS restrictions for custom OpenAI-compatible gateways.
 */
router.post("/api/ai/proxy-chat", requireAuth, async (req, res): Promise<void> => {
  try {
    const { endpoint, apiKey, model, messages, temperature } = req.body;
    if (!endpoint || !model || !messages) {
      res.status(400).json({ error: "Parameter wajib tidak lengkap (endpoint, model, messages)" });
      return;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey && typeof apiKey === "string" && apiKey.trim().length > 0) {
      headers["Authorization"] = `Bearer ${apiKey.trim()}`;
    }

    const upstreamRes = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.3,
      }),
    });

    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      const errMsg =
        data?.error?.message ||
        data?.error ||
        data?.message ||
        `Upstream gateway error (HTTP ${upstreamRes.status})`;
      res.status(upstreamRes.status).json({ error: errMsg });
      return;
    }

    res.json(data);
  } catch (err: any) {
    console.error("AI Proxy Error:", err);
    res.status(500).json({ error: err?.message || "Gagal menghubungi endpoint AI dari server." });
  }
});

export default router;
