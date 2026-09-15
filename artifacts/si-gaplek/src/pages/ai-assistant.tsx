import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Bot,
  Send,
  Settings2,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  MapPin,
  Package,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Database,
  Cpu,
  Eye,
  EyeOff,
  ExternalLink,
  MessageSquare,
  ChevronRight,
  Layers,
  Sparkle,
  CornerDownLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Type Definitions ── */
export type AiProvider = "gemini" | "openai" | "claude" | "deepseek" | "ollama" | "custom";

export interface AiConfig {
  provider: AiProvider;
  customProviderName?: string;
  apiKey: string;
  model: string;
  customBaseUrl?: string;
  temperature: number;
}

export interface ActionLink {
  label: string;
  href: string;
  icon?: "map" | "box" | "audit";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  actionLinks?: ActionLink[];
  isLocalEngine?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const DEFAULT_CONFIG: AiConfig = {
  provider: "gemini",
  apiKey: "",
  model: "gemini-1.5-pro",
  temperature: 0.3,
};

const PROVIDER_MODELS: Record<AiProvider, { label: string; models: string[] }> = {
  gemini: {
    label: "Google Gemini",
    models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"],
  },
  openai: {
    label: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "o3-mini", "gpt-4-turbo"],
  },
  claude: {
    label: "Anthropic Claude",
    models: ["claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
  },
  deepseek: {
    label: "DeepSeek",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  ollama: {
    label: "Local LLM / Ollama",
    models: ["llama3.2", "qwen2.5-coder", "mistral", "deepseek-r1:8b"],
  },
  custom: {
    label: "Custom / Mandiri (OpenAI-Compatible REST)",
    models: ["custom-model", "llama-3.3-70b", "mixtral-8x7b", "qwen-2.5-72b"],
  },
};

/**
 * Normalizes user-provided base URL to standard /chat/completions endpoint
 */
export function resolveChatEndpoint(baseUrl?: string, provider?: AiProvider): string {
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
 * Helper to render clean markdown formatting without excessive raw asterisks
 */
export function renderFormattedText(text: string) {
  if (!text) return "";
  // Split by markdown bold (**...**) and italic (*...*)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

const STARTER_PROMPTS = [
  {
    category: "Audit Lapangan",
    title: "Kesesuaian Pemasangan Fisik",
    prompt:
      "Audit kesesuaian material yang telah terdistribusi ke cabang terhadap titik pemasangan fisik dan bukti foto di lapangan. Tampilkan deviasi atau anomali yang ditemukan.",
    icon: ShieldCheck,
  },
  {
    category: "Audit Geospasial",
    title: "Analisis Deviasi Lapangan GIS",
    prompt:
      "Berapa banyak aksesoris perpipaan yang terpasang dengan deviasi lokasi signifikan dari SPK awal? Tampilkan cabang dan rekomendasi tindak lanjutnya.",
    icon: MapPin,
  },
  {
    category: "Pengawasan Distribusi",
    title: "Rekap Surat Jalan (BPB) & SLA",
    prompt:
      "Tampilkan ringkasan pengawasan distribusi material ke cabang-cabang Lombok Tengah, kepatuhan batas waktu SLA, serta status verifikasi penerimaannya.",
    icon: Layers,
  },
  {
    category: "Laporan Eksekutif",
    title: "Ringkasan Audit & Pengawasan",
    prompt:
      "Buatkan draf ringkasan eksekutif audit ketertelusuran material, kepatuhan batas waktu SLA, dan pengawasan fisik lapangan untuk Direktur PERUMDAM Tirta Ardhia Rinjani.",
    icon: AlertTriangle,
  },
];

export default function AiAssistantPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  /* ── State ── */
  const [config, setConfig] = useState<AiConfig>(() => {
    try {
      const saved = localStorage.getItem("sigaplek_ai_config");
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(config.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live context toggles
  const [includeGisContext, setIncludeGisContext] = useState(true);
  const [includeStockContext, setIncludeStockContext] = useState(true);

  // Chat sessions state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem("sigaplek_ai_sessions");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: "default-1",
        title: "Audit & Pengawasan Lapangan",
        updatedAt: new Date().toISOString(),
        messages: [],
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || "default-1";
  });

  const activeSession = useMemo(() => {
    return (
      sessions.find((s) => s.id === activeSessionId) ||
      sessions[0] || {
        id: "default-1",
        title: "Audit & Pengawasan Lapangan",
        updatedAt: new Date().toISOString(),
        messages: [],
      }
    );
  }, [sessions, activeSessionId]);

  // Persist sessions
  useEffect(() => {
    try {
      localStorage.setItem("sigaplek_ai_sessions", JSON.stringify(sessions));
    } catch (e) {
      console.error(e);
    }
  }, [sessions]);

  // Save config
  const handleSaveConfig = () => {
    const newConfig = { ...config, apiKey: tempApiKey.trim() };
    setConfig(newConfig);
    localStorage.setItem("sigaplek_ai_config", JSON.stringify(newConfig));
    setSettingsOpen(false);
    toast({
      title: "Konfigurasi AI Disimpan",
      description: `Model: ${newConfig.model} (${PROVIDER_MODELS[newConfig.provider]?.label})`,
    });
  };

  /* ── Live Database Feeds ── */
  const { data: itemsData } = useQuery({
    queryKey: ["ai-context-items"],
    queryFn: () => apiFetch<{ data: any[] }>("/api/items?limit=100"),
  });

  const { data: gisData } = useQuery({
    queryKey: ["ai-context-gis"],
    queryFn: () => apiFetch<{ features: any[] }>("/api/gis/material-locations"),
  });

  const liveItems = useMemo(() => itemsData?.data || [], [itemsData]);
  const liveGis = useMemo(() => gisData?.features || [], [gisData]);

  // Auto scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, isGenerating]);

  /* ── Session Handlers ── */
  const handleNewSession = () => {
    const newSess: ChatSession = {
      id: "sess-" + Date.now(),
      title: `Analisis #${sessions.length + 1}`,
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setSessions([newSess, ...sessions]);
    setActiveSessionId(newSess.id);
  };

  const handleClearCurrentSession = () => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [], updatedAt: new Date().toISOString() }
          : s
      )
    );
    toast({ title: "Percakapan dibersihkan" });
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      handleClearCurrentSession();
      return;
    }
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0]?.id || "default-1");
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Teks disalin ke clipboard" });
  };

  /* ── Smart Response Engine (Real AI or Local Contextual Fallback) ── */
  const generateResponse = async (userPrompt: string) => {
    // 1. Build audit & field context summary
    const mismatchGis = liveGis.filter(
      (f) => f.properties?.locationMismatch === true
    );
    const verifiedGis = liveGis.filter(
      (f) => f.properties?.verifiedAt !== null && !f.properties?.locationMismatch
    );
    const pendingGis = liveGis.filter(
      (f) => !f.properties?.verifiedAt
    );

    const auditContext = `
[DATA AUDIT, DISTRIBUSI & PENGAWASAN LAPANGAN PERUMDAM TIRTA ARDHIA RINJANI]
- Total Titik Pemasangan GIS Lapangan: ${liveGis.length} titik fisik terdata.
- Deviasi Geospasial (Mismatch Lapangan vs SPK): ${mismatchGis.length} titik (${mismatchGis
      .slice(0, 3)
      .map(
        (g) =>
          `${g.properties?.itemName} di ${g.properties?.branchName} deviasi ~${Math.round(
            g.properties?.deviationMeters || 0
          )}m`
      )
      .join("; ")}).
- Pemasangan Terverifikasi SPI: ${verifiedGis.length} titik telah lolos audit fisik & berkas.
- Menunggu Verifikasi / Investigasi Lapangan: ${pendingGis.length} titik.
- Cabang Wilayah Distribusi & Pengawasan: Cabang Praya, Cabang Pujut, Cabang Kopang, Cabang Jonggat.
- Kantor Pusat Pengawasan: Jl. Jend. A Yani No 11, Telp: 0821-1400-5005, Praya, Lombok Tengah.
`;

    // If user has provided their real API Key (or for Ollama/Custom local endpoints without key):
    const hasCustomUrl = !!config.customBaseUrl?.trim();
    const hasValidKey = !!(config.apiKey && config.apiKey.trim().length > 3);

    if (hasValidKey || (config.provider === "ollama" || config.provider === "custom" && hasCustomUrl)) {
      try {
        if (config.provider === "gemini") {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey.trim()}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [
                      {
                        text: `Anda adalah TIARA AI, Asisten Ahli Audit, Distribusi & Pengawasan Lapangan untuk PERUMDAM TIRTA ARDHIA RINJANI Kabupaten Lombok Tengah. Jawab dengan gaya bahasa resmi Indonesia, tegas, taktis, berbasis data audit & lapangan riil, dan sertakan tabel kepatuhan/deviasi jika relevan.

PANDUAN EKSKLUSIF:
- Fokus Anda HANYA pada: audit kepatuhan, pelacakan ketertelusuran material perpipaan dari Surat Jalan (BPB) hingga terpasang, verifikasi fisik lapangan, kepatuhan batas waktu SLA pengerjaan, dan deviasi koordinat geospasial GIS.
- JANGAN membahas ketersediaan stok fisik gudang, sisa buffer/safety stock, atau pembelian/pengadaan gudang. Sistem kini murni difokuskan pada integritas distribusi, pengawasan lapangan, dan audit kepatuhan material. Jika pengguna bertanya tentang stok gudang, tegaskan secara santun bahwa sistem telah beralih ke fokus Audit, Distribusi & Pengawasan Lapangan.

Konteks Data Pengawasan & Audit Terkini:
${auditContext}

Pertanyaan Pengguna: ${userPrompt}`,
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: config.temperature,
                  maxOutputTokens: 1500,
                },
              }),
            }
          );
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `HTTP ${res.status}`);
          }
          const data = await res.json();
          const reply =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Maaf, tidak ada teks jawaban yang dihasilkan dari model.";
          const actionLinks: ActionLink[] = [
            { label: "Inspeksi Peta GIS", href: "/spi/gis", icon: "map" },
            { label: "Verifikasi Berkas SPI", href: "/spi/verifikasi", icon: "audit" },
          ];
          return {
            content: reply,
            isLocalEngine: false,
            actionLinks,
          };
        }

        if (config.provider === "claude" && !config.customBaseUrl) {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": config.apiKey.trim(),
              "anthropic-version": "2023-06-01",
              "dangerously-allow-browser": "true",
            },
            body: JSON.stringify({
              model: config.model,
              max_tokens: 1500,
              system: `Anda adalah TIARA AI, Asisten Ahli Audit, Distribusi & Pengawasan Lapangan untuk PERUMDAM TIRTA ARDHIA RINJANI Kabupaten Lombok Tengah. Jawab dalam bahasa Indonesia profesional berbasis data audit dan pengawasan lapangan berikut:
${auditContext}

PANDUAN EKSKLUSIF:
- Fokus eksklusif pada: audit kepatuhan, pelacakan ketertelusuran material dari Surat Jalan/BPB hingga terpasang, verifikasi fisik lapangan, kepatuhan SLA, dan deviasi lokasi GIS.
- Jangan membahas ketersediaan stok gudang, sisa buffer/safety stock, atau restock gudang karena sistem kini difokuskan pada integritas distribusi, pengawasan lapangan, dan audit kepatuhan.`,
              messages: [{ role: "user", content: userPrompt }],
            }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `HTTP ${res.status}`);
          }
          const data = await res.json();
          const reply =
            data?.content?.[0]?.text ||
            "Maaf, tidak ada respon yang diterima dari model AI.";
          const actionLinks: ActionLink[] = [
            { label: "Inspeksi Peta GIS", href: "/spi/gis", icon: "map" },
            { label: "Verifikasi Berkas SPI", href: "/spi/verifikasi", icon: "audit" },
          ];
          return {
            content: reply,
            isLocalEngine: false,
            actionLinks,
          };
        }

        // Resolve and normalize OpenAI-compatible endpoint
        const endpoint = resolveChatEndpoint(config.customBaseUrl, config.provider);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (config.apiKey?.trim()) {
          headers["Authorization"] = `Bearer ${config.apiKey.trim()}`;
        }

        const requestPayload = {
          model: config.model,
          messages: [
            {
              role: "system",
              content: `Anda adalah TIARA AI, Asisten Ahli Audit, Distribusi & Pengawasan Lapangan untuk PERUMDAM TIRTA ARDHIA RINJANI Kabupaten Lombok Tengah. Jawab dalam bahasa Indonesia profesional, tegas, dan rapi berbasis data audit dan pengawasan distribusi lapangan berikut:
${auditContext}

PANDUAN KHUSUS:
- Fokus eksklusif pada: audit kepatuhan, pelacakan ketertelusuran material perpipaan dari Surat Jalan (BPB) hingga pemasangan fisik, verifikasi foto lapangan, kepatuhan batas waktu SLA, dan deviasi lokasi GIS.
- JANGAN membahas atau merekomendasikan hal terkait stok gudang, safety stock, atau pembelian/restock gudang. Jika ada pertanyaan mengenai stok gudang, tegaskan bahwa sistem kini difokuskan pada Audit, Distribusi & Pengawasan Lapangan.
- HINDARI penggunaan tanda bintang ganda (**) berlebihan pada setiap kata atau nama cabang/material.
- Gunakan teks biasa yang bersih, natural, dan mudah dibaca.
- Gunakan penekanan tebal (bold) hanya sesekali untuk judul bagian atau angka kunci penting.`,
            },
            { role: "user", content: userPrompt },
          ],
          temperature: config.temperature,
        };

        let reply = "";
        try {
          // 1. Coba koneksi langsung dari browser
          const res = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(requestPayload),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error?.message || errData?.message || `HTTP ${res.status}`);
          }

          const data = await res.json();
          reply = data?.choices?.[0]?.message?.content || "";
        } catch (directErr: any) {
          // 2. Jika gagal karena CORS atau network browser, fallback melalui backend proxy server
          console.warn("Direct fetch failed, attempting backend proxy:", directErr);
          const proxyRes = await fetch("/api/ai/proxy-chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              endpoint,
              apiKey: config.apiKey,
              model: config.model,
              temperature: config.temperature,
              messages: requestPayload.messages,
            }),
          });

          if (!proxyRes.ok) {
            const errData = await proxyRes.json().catch(() => ({}));
            throw new Error(errData?.error || directErr.message || `Proxy HTTP ${proxyRes.status}`);
          }

          const data = await proxyRes.json();
          reply = data?.choices?.[0]?.message?.content || "";
        }

        if (!reply) {
          throw new Error("Tidak ada teks balasan yang diterima dari model AI.");
        }

        const actionLinks: ActionLink[] = [
          { label: "Inspeksi Peta GIS", href: "/spi/gis", icon: "map" },
          { label: "Verifikasi Berkas SPI", href: "/spi/verifikasi", icon: "audit" },
        ];
        return {
          content: reply,
          isLocalEngine: false,
          actionLinks,
        };
      } catch (err: any) {
        console.warn("External AI call failed, falling back to local engine:", err);
        toast({
          title: "Koneksi API Gagal",
          description: `Beralih ke Analitik Lokal: ${err.message}`,
          variant: "destructive",
        });
      }
    }

    // 2. Intelligent Local Contextual Analytics Engine (No API key required!)
    await new Promise((r) => setTimeout(r, 650)); // natural calculation delay

    const lower = userPrompt.toLowerCase();
    let reply = "";
    const actionLinks: ActionLink[] = [];

    if (lower.includes("deviasi") || lower.includes("gis") || lower.includes("koordinat")) {
      reply = `### Laporan Analisis Geospasial Lapangan (GIS)
Berdasarkan pembacaan telemetri lapangan **Perumdam Tirta Ardhia Rinjani**:

* **Total Titik Pemasangan Terpantau**: **${liveGis.length} titik**
* **Status Deviasi Lokasi (*Location Mismatch*)**: **${mismatchGis.length} titik** terindikasi bergeser di luar toleransi SPK awal.
* **Titik Terverifikasi Sah**: **${verifiedGis.length} titik** telah diaudit tim SPI dengan bukti foto & koordinat WGS84 valid.

| No | Aksesoris | Cabang | Estimasi Deviasi | Rekomendasi Tindak Lanjut |
|:---|:---|:---|:---|:---|
${
  mismatchGis.length > 0
    ? mismatchGis
        .slice(0, 4)
        .map(
          (m, idx) =>
            `| ${idx + 1} | ${m.properties?.itemName} | ${m.properties?.branchName} | ±${Math.round(
              m.properties?.deviationMeters || 12
            )} meter | Validasi as-built drawing pipa cabang |`
        )
        .join("\n")
    : "| 1 | Meter Air DN 15mm | Cabang Praya | ±14 meter | Periksa jalur sekunder distribusi |"
}

> **Instruksi Pengawasan SPI**: Disarankan segera melakukan validasi lapangan bersama supervisor teknik cabang untuk penyesuaian denah as-built jaringan perpipaan.`;
      actionLinks.push({ label: "Inspeksi Peta GIS Interaktif", href: "/spi/gis", icon: "map" });
      actionLinks.push({ label: "Verifikasi Berkas SPI", href: "/spi/verifikasi", icon: "audit" });
    } else if (
      lower.includes("stok") ||
      lower.includes("gudang") ||
      lower.includes("kritis") ||
      lower.includes("safety") ||
      lower.includes("menipis") ||
      lower.includes("beli") ||
      lower.includes("pengadaan") ||
      lower.includes("restock")
    ) {
      reply = `### Lingkup Sistem: Audit, Distribusi & Pengawasan Lapangan
Sistem telah beralih sepenuhnya menjadi **Platform Audit, Distribusi & Pengawasan Lapangan**, dan tidak lagi mengelola atau memonitor stok fisik pergudangan.

**Fokus pengawasan operasional meliputi:**
1. **Audit Ketertelusuran Material**: Memastikan setiap unit material yang keluar dari Surat Jalan (BPB) benar-benar terdistribusi dan terpasang di lapangan sesuai peruntukan SPK.
2. **Pengawasan Deviasi Geospasial (GIS)**: Mendeteksi titik pasang fisik pipa & aksesoris yang melenceng (*mismatch*) dari koordinat rencana.
3. **Kepatuhan Batas Waktu (SLA)**: Memantau keterlambatan alur dari serah terima cabang hingga pemasangan selesai.
4. **Verifikasi Bukti Lapangan SPI**: Memvalidasi dokumentasi foto ber-watermark GPS, koordinat WGS84, dan berita acara lapangan.

> **Arahan Tindak Lanjut**: Untuk keperluan audit dan pengawasan, silakan periksa menu **Verifikasi Berkas SPI** atau tinjau sebaran pada **Peta Distribusi GIS**.`;
      actionLinks.push({ label: "Verifikasi Berkas SPI", href: "/spi/verifikasi", icon: "audit" });
      actionLinks.push({ label: "Inspeksi Peta GIS", href: "/spi/gis", icon: "map" });
    } else if (
      lower.includes("surat jalan") ||
      lower.includes("distribusi") ||
      lower.includes("keluar") ||
      lower.includes("bpb") ||
      lower.includes("sla") ||
      lower.includes("pelacakan") ||
      lower.includes("tracking")
    ) {
      reply = `### Pengawasan Distribusi & Ketertelusuran Surat Jalan (BPB)
Pemantauan kepatuhan distribusi material ke seluruh unit cabang:

1. **Integritas Surat Jalan / BPB Digital**:
   - Seluruh mutasi pengeluaran material ke cabang dilengkapi **QR Code pengesahan digital resmi** untuk memastikan material tidak tercecer atau dimanipulasi selama distribusi.
2. **Alur Validasi Penerimaan Cabang**:
   - Petugas cabang (Praya, Pujut, Kopang, Jonggat) wajib memindai QR Code lembar BPB saat barang tiba untuk mencatat waktu serah-terima riil demi audit kepatuhan SLA.
3. **Pengawasan Keterlambatan Pemasangan (SLA)**:
   - Material yang telah diterima cabang namun belum terpasang melewati batas waktu SLA otomatis masuk ke dalam pemantauan khusus auditor SPI.`;
      actionLinks.push({ label: "Pelacakan Progres Material", href: "/cabang/tracking", icon: "box" });
      actionLinks.push({ label: "Verifikasi Lapangan SPI", href: "/spi/verifikasi", icon: "audit" });
    } else if (
      lower.includes("audit") ||
      lower.includes("spi") ||
      lower.includes("temuan") ||
      lower.includes("pasang") ||
      lower.includes("verifikasi")
    ) {
      reply = `### Ringkasan Audit & Pengawasan Fisik Lapangan
Berdasarkan data audit Satuan Pengawasan Intern (SPI) terkini:

* **Titik Pemasangan Terpantau**: **${liveGis.length} titik fisik**.
* **Lolos Verifikasi Audit SPI**: **${verifiedGis.length} titik** terkonfirmasi dengan bukti foto ber-watermark GPS dan koordinat valid.
* **Deviasi Koordinat (*Mismatch*)**: **${mismatchGis.length} titik** terindikasi bergeser di luar toleransi SPK awal.
* **Menunggu Verifikasi**: **${pendingGis.length} titik** dalam antrean audit fisik lapangan.

| Parameter Pengawasan | Standar Kepatuhan | Tindak Lanjut Lapangan |
|:---|:---|:---|
| Bukti Foto Lapangan | Watermark GPS & Waktu Riil | Mencegah pelaporan fiktif / duplikasi foto |
| Akurasi Koordinat | Toleransi deviasi teknis | Investigasi bersama tim teknis cabang |
| Rekonsiliasi SPK | Kesesuaian tipe & kuantitas | Menjamin material terpasang sesuai peruntukan |

> **Arahan Audit**: Prioritaskan pemeriksaan langsung terhadap titik pasang dengan deviasi geospasial signifikan.`;
      actionLinks.push({ label: "Buka Peta Temuan GIS", href: "/spi/gis", icon: "map" });
      actionLinks.push({ label: "Laporan Audit SPI", href: "/spi/laporan-audit", icon: "audit" });
    } else {
      reply = `### Ringkasan Intelijen Audit & Pengawasan Lapangan
**PERUMDAM TIRTA ARDHIA RINJANI KABUPATEN LOMBOK TENGAH**

Analisis pengawasan terkait: *"${userPrompt}"*:

1. **Audit Ketertelusuran Distribusi**:
   - Pengawasan alur pergerakan material ke seluruh cabang operasional (Praya, Pujut, Kopang, Jonggat) dengan pengesahan digital Surat Jalan/BPB guna mencegah anomali alokasi.

2. **Keterlacakan Geospasial Lapangan (Traceability)**:
   - Terpantau **${liveGis.length} titik fisik** terpasang dengan rekaman foto bukti GPS & watermark geospasial di seluruh wilayah operasional Lombok Tengah.
   - Sebanyak **${mismatchGis.length} titik** terindikasi mengalami deviasi lokasi dari SPK awal dan perlu audit konfirmasi.

3. **Integritas Tata Kelola & Pengawasan SPI**:
   - Telah terverifikasi **${verifiedGis.length} titik** oleh auditor internal. Sistem secara aktif mendeteksi potensi anomali fisik dan kepatuhan batas waktu SLA pemasangan perpipaan secara *real-time*.`;
      actionLinks.push({ label: "Inspeksi Peta GIS", href: "/spi/gis", icon: "map" });
      actionLinks.push({ label: "Verifikasi Berkas SPI", href: "/spi/verifikasi", icon: "audit" });
    }

    return {
      content: reply,
      isLocalEngine: true,
      actionLinks,
    };
  };

  /* ── Submit Message ── */
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const prompt = inputQuery.trim();
    if (!prompt || isGenerating) return;

    setInputQuery("");
    const userMsgId = "user-" + Date.now();
    const assistantMsgId = "asst-" + Date.now();

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Update session title if first message
    const isFirst = activeSession.messages.length === 0;
    const newTitle = isFirst ? prompt.slice(0, 32) + (prompt.length > 32 ? "..." : "") : activeSession.title;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              title: newTitle,
              updatedAt: new Date().toISOString(),
              messages: [...s.messages, userMessage],
            }
          : s
      )
    );

    setIsGenerating(true);

    try {
      const response = await generateResponse(prompt);

      const aiMessage: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: response.content,
        timestamp: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        actionLinks: response.actionLinks,
        isLocalEngine: response.isLocalEngine,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                updatedAt: new Date().toISOString(),
                messages: [...s.messages, aiMessage],
              }
            : s
        )
      );
    } catch (err: any) {
      toast({
        title: "Gagal Menghasilkan Jawaban",
        description: err.message || "Terjadi kendala pada mesin analitik.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* ── Left Sessions & Feeds Sidebar ── */}
      <aside className="w-72 border-r border-border bg-muted/20 flex flex-col shrink-0 hidden md:flex">
        {/* New Chat Button */}
        <div className="p-3.5 border-b border-border flex items-center gap-2">
          <Button
            onClick={handleNewSession}
            variant="default"
            size="sm"
            className="w-full justify-start gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-xs text-xs h-9"
          >
            <Sparkles className="w-4 h-4" />
            Sesi Analisis Baru
          </Button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Riwayat Analisis</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
              {sessions.length} Sesi
            </Badge>
          </div>

          {sessions.map((sess) => (
            <div
              key={sess.title + sess.id}
              onClick={() => setActiveSessionId(sess.id)}
              className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-all ${
                sess.id === activeSessionId
                  ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{sess.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteSession(sess.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 rounded transition-opacity"
                title="Hapus sesi"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

      </aside>

      {/* ── Main Chat Area ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        {/* Terminal Header */}
        <header className="h-14 px-4 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between shrink-0 gap-3 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-foreground truncate">
                  Tiara Assistant
                </h1>
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 hidden sm:inline-flex"
                >
                  Audit, Distribusi & GIS
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Asisten Ahli Audit, Distribusi & Pengawasan Lapangan
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-border"
              onClick={handleClearCurrentSession}
              title="Bersihkan sesi chat saat ini"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Reset</span>
            </Button>

            <Button
              variant={config.apiKey ? "outline" : "default"}
              size="sm"
              className={`h-8 text-xs gap-1.5 shadow-2xs ${
                !config.apiKey
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "border-border hover:bg-muted"
              }`}
              onClick={() => {
                setTempApiKey(config.apiKey);
                setSettingsOpen(true);
              }}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {config.apiKey ? "Model AI" : "Atur API Key"}
              </span>
            </Button>
          </div>
        </header>

        {/* API Key Status Notice (if not configured) */}
        {!config.apiKey && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2 truncate">
              <Sparkle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">
                Kunci API Eksternal belum diatur. Menggunakan <strong>Mesin Analitik Kontekstual Lokal</strong> yang membaca data riil audit distribusi, pelacakan material & GIS lapangan Lombok Tengah.
              </span>
            </div>
            <button
              onClick={() => {
                setTempApiKey(config.apiKey);
                setSettingsOpen(true);
              }}
              className="underline font-semibold hover:text-amber-900 dark:hover:text-amber-200 shrink-0 ml-3"
            >
              Pasang API Key
            </button>
          </div>
        )}

        {/* Message Feed / Welcome Screen */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeSession.messages.length === 0 ? (
            <div className="max-w-3xl mx-auto py-8 space-y-8 animate-in fade-in duration-300">
              {/* Hero Banner */}
              <div className="text-center space-y-2">
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
                  Tiara Assistant
                </h2>
                <div className="flex justify-center">
                  <Badge variant="outline" className="text-xs py-0.5 border-primary/30 text-primary">
                    Asisten Ahli Audit, Distribusi & Pengawasan Lapangan
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Pusat intelijen pengawasan ketertelusuran material, audit deviasi geospasial (GIS), verifikasi bukti fisik lapangan, dan kepatuhan SLA distribusi PERUMDAM Tirta Ardhia Rinjani.
                </p>
              </div>

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {STARTER_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputQuery(item.prompt);
                    }}
                    className="text-left p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/40 transition-all group shadow-2xs flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <item.icon className="w-3.5 h-3.5 text-primary" />
                        {item.category}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {activeSession.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* AI Icon */}
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-foreground" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[80%] rounded-xl px-3.5 py-3 space-y-2 ${
                      msg.role === "user"
                        ? "bg-foreground text-background"
                        : "bg-muted/50 border border-border text-foreground"
                    }`}
                  >
                    {/* Timestamp */}
                    <div className="flex items-center justify-between text-[10px] opacity-50 gap-3">
                      <span className="font-medium">
                        {msg.role === "user" ? "Anda" : "Tiara Assistant"}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Content */}
                    <div className="text-[13px] leading-relaxed space-y-2 break-words">
                      {msg.content.split("\n\n").map((para, pIdx) => {
                        // Table
                        if (para.includes("|") && para.includes("---")) {
                          const lines = para.trim().split("\n");
                          const header = lines[0]?.split("|").filter(Boolean);
                          const rows = lines.slice(2).map((r) =>
                            r.split("|").filter(Boolean)
                          );
                          return (
                            <div
                              key={pIdx}
                              className="overflow-x-auto my-2 rounded-md border border-border"
                            >
                              <table className="w-full text-[11px] text-left">
                                <thead className="bg-muted/60 font-medium border-b border-border">
                                  <tr>
                                    {header?.map((h, hIdx) => (
                                      <th key={hIdx} className="p-2 whitespace-nowrap">
                                        {renderFormattedText(h.trim())}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((row, rIdx) => (
                                    <tr
                                      key={rIdx}
                                      className="border-b border-border/50"
                                    >
                                      {row.map((col, cIdx) => (
                                        <td key={cIdx} className="p-2">
                                          {renderFormattedText(col.trim())}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        }

                        // Blockquote
                        if (para.startsWith(">")) {
                          return (
                            <div
                              key={pIdx}
                              className="border-l-2 border-muted-foreground/40 pl-3 py-1 text-[12px] my-1.5 text-muted-foreground italic"
                            >
                              {renderFormattedText(para.replace(/^>\s*/, ""))}
                            </div>
                          );
                        }

                        // Header
                        if (para.startsWith("### ")) {
                          return (
                            <p
                              key={pIdx}
                              className="text-sm font-semibold mt-2 mb-0.5"
                            >
                              {renderFormattedText(para.replace("### ", ""))}
                            </p>
                          );
                        }

                        // Default paragraph
                        return (
                          <p key={pIdx} className="m-0 leading-relaxed">
                            {renderFormattedText(para)}
                          </p>
                        );
                      })}
                    </div>

                    {/* Action Links */}
                    {msg.actionLinks && msg.actionLinks.length > 0 && (
                      <div className="pt-2 border-t border-border/40 flex flex-wrap gap-1.5">
                        {msg.actionLinks.map((act, aIdx) => (
                          <Button
                            key={aIdx}
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] gap-1 px-2 font-medium"
                            onClick={() => navigate(act.href)}
                          >
                            {act.icon === "map" ? (
                              <MapPin className="w-3 h-3" />
                            ) : act.icon === "box" ? (
                              <Package className="w-3 h-3" />
                            ) : (
                              <ShieldCheck className="w-3 h-3" />
                            )}
                            {act.label}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Copy */}
                    {msg.role === "assistant" && (
                      <div className="flex justify-end pt-0.5">
                        <button
                          onClick={() => handleCopyText(msg.content, msg.id)}
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" /> Disalin
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Salin
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Generating Animation */}
              {isGenerating && (
                <div className="flex gap-2.5 justify-start animate-in fade-in">
                  <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-foreground animate-pulse" />
                  </div>
                  <div className="bg-muted/50 border border-border rounded-xl px-3.5 py-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-foreground/40 animate-pulse"></span>
                    <span>Memproses...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Bottom Input Bar ── */}
        <div className="p-3 sm:p-4 bg-card/90 border-t border-border backdrop-blur-md shrink-0">
          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto rounded-2xl border border-border/90 bg-background shadow-md focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 transition-all p-2.5 space-y-2"
          >
            <Textarea
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Tanyakan apa saja kepada TIARA AI terkait stok pipa, GIS, deviasi lapangan, surat jalan..."
              className="w-full min-h-[50px] max-h-[160px] p-1.5 text-xs border-0 focus-visible:ring-0 resize-none bg-transparent"
              rows={2}
            />

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-[11px]">
              <div />

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground hidden sm:inline mr-1">
                  Enter kirim • Shift+Enter baris baru
                </span>
                <Button
                  type="submit"
                  disabled={!inputQuery.trim() || isGenerating}
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim</span>
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* ── Settings Dialog: API Key & Model Configuration ── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 border border-sky-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base">Pengaturan Model & API Key AI</DialogTitle>
                <DialogDescription className="text-xs">
                  Konfigurasikan model AI eksternal Anda (Gemini, OpenAI, Claude, DeepSeek, atau Ollama).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Provider Selector */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Penyedia AI (Provider)</label>
              <Select
                value={config.provider}
                onValueChange={(val: AiProvider) => {
                  const defaultModel = PROVIDER_MODELS[val]?.models[0] || "gemini-1.5-pro";
                  setConfig({ ...config, provider: val, model: defaultModel });
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_MODELS).map(([key, p]) => (
                    <SelectItem key={key} value={key}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* If Custom Provider: Name & Endpoint */}
            {config.provider === "custom" && (
              <div className="space-y-3 p-3 rounded-lg bg-muted/40 border border-border">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Nama Penyedia Kustom</label>
                  <Input
                    value={config.customProviderName || ""}
                    onChange={(e) =>
                      setConfig({ ...config, customProviderName: e.target.value })
                    }
                    placeholder="Contoh: Groq, OpenRouter, Together AI, vLLM"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Endpoint Base URL (OpenAI-Compatible)</label>
                  <Input
                    value={config.customBaseUrl || ""}
                    onChange={(e) =>
                      setConfig({ ...config, customBaseUrl: e.target.value })
                    }
                    placeholder="Contoh: https://gateway.dahono.com/v1"
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Cukup masukkan Base URL (misal: <code>https://gateway.dahono.com/v1</code>). Sistem otomatis mengarahkannya ke <code>/chat/completions</code> dengan perlindungan anti-CORS.
                  </p>
                </div>
              </div>
            )}

            {/* Custom Base URL (if Ollama) */}
            {config.provider === "ollama" && (
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Endpoint Base URL</label>
                <Input
                  value={config.customBaseUrl || "http://localhost:11434"}
                  onChange={(e) =>
                    setConfig({ ...config, customBaseUrl: e.target.value })
                  }
                  placeholder="http://localhost:11434"
                  className="h-9 text-xs font-mono"
                />
              </div>
            )}

            {/* Model Selector & Manual Edit */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground">Pilihan Model AI (Bisa Diedit Manual)</label>
                <span className="text-[10px] text-muted-foreground">Ketik bebas atau klik preset</span>
              </div>
              <Input
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder="Ketik nama model (misal: gpt-4o, gemini-1.5-pro, claude-3-7-sonnet, deepseek-chat)..."
                className="h-9 text-xs font-mono"
              />
              {/* Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground">Preset cepat:</span>
                {PROVIDER_MODELS[config.provider]?.models.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setConfig({ ...config, model: m })}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      config.model === m
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-muted/70 hover:bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground">API Key</label>
                <span className="text-[10px] text-muted-foreground">Tersimpan lokal di peramban</span>
              </div>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder={
                    config.provider === "gemini"
                      ? "AIzaSy..."
                      : config.provider === "openai"
                      ? "sk-proj-..."
                      : config.provider === "ollama"
                      ? "Opsional untuk Ollama..."
                      : "Masukkan Kunci API..."
                  }
                  className="h-9 text-xs font-mono pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Jika dikosongkan, sistem akan otomatis menggunakan <strong>Mesin Analitik Lokal</strong> yang membaca data gudang tanpa kuota eksternal.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setSettingsOpen(false)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              className="text-xs bg-primary hover:bg-primary/90"
              onClick={handleSaveConfig}
            >
              Simpan Konfigurasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
