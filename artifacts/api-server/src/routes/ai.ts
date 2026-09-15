// @ts-nocheck
import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../lib/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

function resolveEndpoint(baseUrl?: string, provider?: string): string {
  if (provider === "gemini") return "";
  if (provider === "claude" && !baseUrl?.trim()) return "https://api.anthropic.com/v1/messages";
  if (provider === "deepseek" && !baseUrl?.trim()) return "https://api.deepseek.com/v1/chat/completions";
  if (provider === "ollama" && !baseUrl?.trim()) return "http://localhost:11434/v1/chat/completions";

  let clean = (baseUrl || "").trim().replace(/\/+$/, "");
  if (!clean) {
    return "https://api.openai.com/v1/chat/completions";
  }
  if (clean.endsWith("/chat/completions")) {
    return clean;
  }
  if (clean.endsWith("/v1") || clean.endsWith("/v1beta")) {
    return `${clean}/chat/completions`;
  }
  return `${clean}/v1/chat/completions`;
}

/**
 * GET /api/ai/config
 * Retrieves system-wide AI configuration from PostgreSQL system_settings.
 * Sensitive API keys are masked for non-admins to ensure security.
 */
router.get("/api/ai/config", requireAuth, async (req, res): Promise<void> => {
  try {
    const result = await pool.query(
      "SELECT key, value, updated_at, updated_by FROM system_settings WHERE key = 'ai_config'"
    );
    const rawConfig = result.rows[0]?.value || null;
    if (!rawConfig) {
      res.json({ config: null });
      return;
    }

    const isAdmin = (req.session.userRole || "").toUpperCase() === "ADMIN";
    const config = { ...rawConfig };

    if (!isAdmin && config.apiKey) {
      const k = config.apiKey.trim();
      config.apiKey = k.length > 8 ? `${k.slice(0, 4)}••••••••${k.slice(-4)}` : "••••••••";
      config.hasApiKey = true;
    } else if (config.apiKey) {
      config.hasApiKey = true;
    }

    res.json({
      config,
      updatedAt: result.rows[0]?.updated_at,
      updatedBy: result.rows[0]?.updated_by,
    });
  } catch (err: any) {
    console.error("Failed to fetch AI config:", err);
    res.status(500).json({ error: "Gagal memuat konfigurasi AI dari server." });
  }
});

/**
 * POST /api/ai/config
 * Saves system-wide AI configuration into database.
 * RESTRICTED: Admin only.
 */
router.post("/api/ai/config", requireAuth, requireRole("ADMIN"), async (req, res): Promise<void> => {
  try {
    const { provider, model, apiKey, customBaseUrl, customProviderName, temperature } = req.body;
    if (!provider || !model) {
      res.status(400).json({ error: "Provider dan Model wajib diisi." });
      return;
    }

    // Check existing config to preserve key if masked
    const existingRes = await pool.query("SELECT value FROM system_settings WHERE key = 'ai_config'");
    const existing = existingRes.rows[0]?.value || {};

    let finalApiKey = typeof apiKey === "string" ? apiKey.trim() : "";
    if (!finalApiKey || finalApiKey.includes("••••")) {
      finalApiKey = existing.apiKey || "";
    }

    const newConfig = {
      provider: String(provider).trim(),
      model: String(model).trim(),
      apiKey: finalApiKey,
      customBaseUrl: customBaseUrl ? String(customBaseUrl).trim() : "",
      customProviderName: customProviderName ? String(customProviderName).trim() : "",
      temperature: typeof temperature === "number" ? temperature : 0.3,
    };

    await pool.query(
      `INSERT INTO system_settings (key, value, updated_at, updated_by)
       VALUES ('ai_config', $1, NOW(), $2)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by`,
      [JSON.stringify(newConfig), req.session.userId]
    );

    res.json({
      success: true,
      message: "Konfigurasi AI berhasil disimpan di database server dan tersinkron ke semua perangkat.",
      config: newConfig,
    });
  } catch (err: any) {
    console.error("Failed to save AI config:", err);
    res.status(500).json({ error: "Gagal menyimpan konfigurasi AI ke database." });
  }
});

/**
 * POST /api/ai/chat
 * Server-side AI completion using the centrally configured AI key.
 * Available to authenticated users without requiring client to hold raw API keys.
 */
router.post("/api/ai/chat", requireAuth, async (req, res): Promise<void> => {
  try {
    const { prompt, context, system } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Prompt pengguna wajib diisi." });
      return;
    }

    // Retrieve active AI config from system_settings
    const configRes = await pool.query("SELECT value FROM system_settings WHERE key = 'ai_config'");
    const config = configRes.rows[0]?.value;

    if (!config || (!config.apiKey && config.provider !== "ollama" && !(config.provider === "custom" && config.customBaseUrl))) {
      res.status(400).json({ error: "Konfigurasi AI belum disetel oleh Administrator pada sistem." });
      return;
    }

    const { provider, model, apiKey, customBaseUrl, temperature } = config;
    const actionLinks = [
      { label: "Inspeksi Peta GIS", href: "/spi/gis", icon: "map" },
      { label: "Verifikasi Berkas SPI", href: "/spi/verifikasi", icon: "audit" },
    ];

    if (provider === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${system || "Anda adalah TIARA AI, Asisten Ahli Audit, Distribusi & Pengawasan Lapangan."}\n\nKonteks Data Lapangan:\n${context || ""}\n\nPertanyaan Pengguna: ${prompt}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: temperature ?? 0.3,
              maxOutputTokens: 1500,
            },
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Google Gemini HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada respon teks dari model.";
      res.json({ content, actionLinks, isLocalEngine: false });
      return;
    }

    if (provider === "claude" && !customBaseUrl) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1500,
          system: `${system || "Anda adalah TIARA AI, Asisten Ahli Audit, Distribusi & Pengawasan Lapangan."}\n\nKonteks Data Lapangan:\n${context || ""}`,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Anthropic Claude HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data?.content?.[0]?.text || "Tidak ada respon teks dari model.";
      res.json({ content, actionLinks, isLocalEngine: false });
      return;
    }

    // OpenAI, DeepSeek, Ollama, Custom OpenAI-Compatible
    const endpoint = resolveEndpoint(customBaseUrl, provider);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `${system || "Anda adalah TIARA AI, Asisten Ahli Audit, Distribusi & Pengawasan Lapangan."}\n\nKonteks Data Lapangan:\n${context || ""}`,
          },
          { role: "user", content: prompt },
        ],
        temperature: temperature ?? 0.3,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || errData?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "Tidak ada respon teks dari model.";
    res.json({ content, actionLinks, isLocalEngine: false });
  } catch (err: any) {
    console.error("AI Completion Error:", err);
    res.status(500).json({ error: err?.message || "Gagal menghasilkan jawaban dari model AI." });
  }
});

/**
 * POST /api/ai/proxy-chat (legacy/custom direct messages proxy)
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
