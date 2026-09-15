// @ts-nocheck
import { Router, type IRouter } from "express";
import crypto from "crypto";
import { requireAuth, requireRole } from "../lib/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

/* ── AES-256-GCM Encryption / Decryption Utilities ── */
const ENCRYPTION_SECRET =
  process.env.ENCRYPTION_KEY ||
  process.env.SESSION_SECRET ||
  "si-gaplek-ai-secret-salt-2026-key";
const ENCRYPTION_KEY = crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();

/**
 * Encrypts sensitive text using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<auth_tag_hex>:<cipher_hex>
 */
export function encryptSecret(plainText: string): string {
  if (!plainText || typeof plainText !== "string") return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `enc:v1:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM ciphertext.
 * Gracefully handles legacy plain text for backward compatibility.
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText || typeof cipherText !== "string") return "";
  if (!cipherText.startsWith("enc:v1:")) {
    // Legacy plain text fallback
    return cipherText;
  }
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 5) return "";
    const [, , ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Gagal mendekripsi secret AI:", err?.message || err);
    return "";
  }
}

// Ensure system_settings table exists
async function ensureSettingsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_by INTEGER
      );
    `);
  } catch (err) {
    console.error("ensureSettingsTable error:", err?.message || err);
  }
}
ensureSettingsTable();

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
 * GET /ai/config & /api/ai/config
 * Retrieves system-wide AI configuration from PostgreSQL system_settings.
 * Sensitive API keys are decrypted in memory for ADMIN, and masked for non-admins.
 */
router.get(["/ai/config", "/api/ai/config"], requireAuth, async (req, res): Promise<void> => {
  try {
    await ensureSettingsTable();
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

    // Decrypt the stored API key in memory
    const plainApiKey = decryptSecret(config.apiKey);

    if (isAdmin) {
      // Admin gets the plain decrypted API key to view/edit in the settings modal
      config.apiKey = plainApiKey;
      config.hasApiKey = !!plainApiKey;
    } else {
      // Non-admin receives strictly masked API key for security
      if (plainApiKey) {
        config.apiKey =
          plainApiKey.length > 8
            ? `${plainApiKey.slice(0, 4)}••••••••${plainApiKey.slice(-4)}`
            : "••••••••";
        config.hasApiKey = true;
      } else {
        config.apiKey = "";
        config.hasApiKey = false;
      }
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
 * POST /ai/config & /api/ai/config
 * Saves system-wide AI configuration into database with AES-256-GCM encryption at-rest.
 * RESTRICTED: Admin only.
 */
router.post(["/ai/config", "/api/ai/config"], requireAuth, requireRole("ADMIN"), async (req, res): Promise<void> => {
  try {
    await ensureSettingsTable();
    const { provider, model, apiKey, customBaseUrl, customProviderName, temperature } = req.body;
    if (!provider || !model) {
      res.status(400).json({ error: "Provider dan Model wajib diisi." });
      return;
    }

    // Check existing config to preserve key if masked or unchanged
    const existingRes = await pool.query("SELECT value FROM system_settings WHERE key = 'ai_config'");
    const existing = existingRes.rows[0]?.value || {};

    let finalEncryptedKey = existing.apiKey || "";

    if (typeof apiKey === "string" && apiKey.trim().length > 0) {
      if (!apiKey.includes("••••")) {
        // New API key provided -> encrypt with AES-256-GCM before saving to database
        finalEncryptedKey = encryptSecret(apiKey.trim());
      }
      // If contains ••••, keep existing encrypted key untouched
    } else if (apiKey === "") {
      finalEncryptedKey = "";
    }

    const newConfig = {
      provider: String(provider).trim(),
      model: String(model).trim(),
      apiKey: finalEncryptedKey, // Stored as AES-256-GCM ciphertext in PostgreSQL
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
      message: "Konfigurasi AI berhasil disimpan di database server dan terenkripsi AES-256-GCM.",
      config: {
        ...newConfig,
        apiKey: apiKey?.trim() || "",
        hasApiKey: !!finalEncryptedKey,
      },
    });
  } catch (err: any) {
    console.error("Failed to save encrypted AI config:", err);
    res.status(500).json({ error: "Gagal menyimpan konfigurasi AI ke database." });
  }
});

/**
 * POST /ai/chat & /api/ai/chat
 * Server-side AI completion using centrally configured, encrypted AI key.
 * Available to authenticated users without requiring client to hold raw API keys.
 */
router.post(["/ai/chat", "/api/ai/chat"], requireAuth, async (req, res): Promise<void> => {
  try {
    const { prompt, context, system } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Prompt pengguna wajib diisi." });
      return;
    }

    // Retrieve active AI config from system_settings
    await ensureSettingsTable();
    const configRes = await pool.query("SELECT value FROM system_settings WHERE key = 'ai_config'");
    const config = configRes.rows[0]?.value;

    if (!config) {
      res.status(400).json({ error: "Konfigurasi AI belum disetel oleh Administrator pada sistem." });
      return;
    }

    // Decrypt the API key in memory
    const apiKey = decryptSecret(config.apiKey);

    if (!apiKey && config.provider !== "ollama" && !(config.provider === "custom" && config.customBaseUrl)) {
      res.status(400).json({ error: "Kunci API belum diisi atau gagal didekripsi." });
      return;
    }

    const { provider, model, customBaseUrl, temperature } = config;
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
 * POST /ai/proxy-chat & /api/ai/proxy-chat (legacy/custom direct messages proxy)
 */
router.post(["/ai/proxy-chat", "/api/ai/proxy-chat"], requireAuth, async (req, res): Promise<void> => {
  try {
    let { endpoint, apiKey, model, messages, temperature } = req.body;
    if (!endpoint || !model || !messages) {
      res.status(400).json({ error: "Parameter wajib tidak lengkap (endpoint, model, messages)" });
      return;
    }

    // If apiKey not sent or masked, decrypt from server config
    if (!apiKey || apiKey.includes("••••")) {
      const configRes = await pool.query("SELECT value FROM system_settings WHERE key = 'ai_config'");
      const config = configRes.rows[0]?.value;
      if (config?.apiKey) {
        apiKey = decryptSecret(config.apiKey);
      }
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
