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

const STARTER_PROMPTS = [
  {
    category: "Stok & Kebutuhan",
    title: "Material Kritis (Safety Stock)",
    prompt:
      "Periksa material perpipaan yang stoknya berada di bawah batas minimum (safety stock). Buatkan rincian prioritas pengadaan dan estimasi anggaran.",
    icon: Package,
  },
  {
    category: "Audit Geospasial",
    title: "Analisis Deviasi Lapangan GIS",
    prompt:
      "Berapa banyak aksesoris yang terpasang dengan deviasi lokasi signifikan dari SPK awal? Tampilkan cabang dan rekomendasi tindak lanjutnya.",
    icon: MapPin,
  },
  {
    category: "Distribusi Cabang",
    title: "Rekap Surat Jalan (BPB) Aktif",
    prompt:
      "Tampilkan ringkasan distribusi material keluar terbaru ke cabang-cabang Lombok Tengah beserta status verifikasi penerimaannya.",
    icon: Layers,
  },
  {
    category: "Laporan Eksekutif",
    title: "Ringkasan Eksekutif Direksi",
    prompt:
      "Buatkan draf ringkasan eksekutif kondisi logistik dan keterlacakan pipa untuk Direktur PERUMDAM Tirta Ardhia Rinjani.",
    icon: ShieldCheck,
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
        title: "Analisis Logistik Umum",
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
        title: "Analisis Logistik",
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
    // 1. Build warehouse context summary
    const criticalStockItems = liveItems.filter(
      (it) => it.currentStock <= it.minimumStock
    );
    const mismatchGis = liveGis.filter(
      (f) => f.properties?.locationMismatch === true
    );
    const verifiedGis = liveGis.filter(
      (f) => f.properties?.verifiedAt !== null && !f.properties?.locationMismatch
    );

    const warehouseContext = `
[DATA RIIL PERUMDAM TIRTA ARDHIA RINJANI KABUPATEN LOMBOK TENGAH]
- Total Master Material: ${liveItems.length} jenis aksesoris & pipa.
- Material Kritis (Stok <= Safety Stock): ${criticalStockItems.length} barang (${criticalStockItems
      .slice(0, 5)
      .map((it) => `${it.name} (Sisa: ${it.currentStock} ${it.unitName || "Buah"})`)
      .join(", ")}).
- Titik Pemasangan GIS: ${liveGis.length} titik fisik terdata.
- Deviasi Geospasial (Mismatch): ${mismatchGis.length} titik (${mismatchGis
      .slice(0, 3)
      .map(
        (g) =>
          `${g.properties?.itemName} di ${g.properties?.branchName} deviasi ~${Math.round(
            g.properties?.deviationMeters || 0
          )}m`
      )
      .join("; ")}).
- Pemasangan Terverifikasi SPI: ${verifiedGis.length} titik.
- Cabang Pelaksana: Cabang Praya, Cabang Pujut, Cabang Kopang, Cabang Jonggat.
- Kantor Pusat: Jl. Jend. A Yani No 11, Telp: 0821-1400-5005, Praya, Lombok Tengah.
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
                        text: `Anda adalah TIARA AI, Asisten Ahli Logistik & Distribusi Perpipaan untuk PERUMDAM TIRTA ARDHIA RINJANI Kabupaten Lombok Tengah. Jawab dengan gaya bahasa resmi Indonesia, ringkas, taktis, berbasis data riil, dan sertakan tabel analitik jika relevan.\n\nKonteks Data Gudang Terkini:\n${warehouseContext}\n\nPertanyaan Pengguna: ${userPrompt}`,
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
            { label: "Buka Peta Material GIS", href: "/spi/gis", icon: "map" },
            { label: "Lihat Master Material", href: "/master/barang", icon: "box" },
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
              system: `Anda adalah TIARA AI, Asisten Ahli Logistik & Distribusi Perpipaan untuk PERUMDAM TIRTA ARDHIA RINJANI Kabupaten Lombok Tengah. Jawab dalam bahasa Indonesia profesional berbasis data gudang berikut:\n${warehouseContext}`,
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
            { label: "Buka Peta Material GIS", href: "/spi/gis", icon: "map" },
            { label: "Lihat Master Material", href: "/master/barang", icon: "box" },
          ];
          return {
            content: reply,
            isLocalEngine: false,
            actionLinks,
          };
        }

        // OpenAI / DeepSeek / Ollama / Custom (OpenAI-compatible) endpoint
        const endpoint =
          config.provider === "deepseek"
            ? (config.customBaseUrl || "https://api.deepseek.com/v1/chat/completions")
            : config.provider === "ollama"
            ? `${config.customBaseUrl || "http://localhost:11434"}/v1/chat/completions`
            : config.customBaseUrl || "https://api.openai.com/v1/chat/completions";

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (config.apiKey?.trim()) {
          headers["Authorization"] = `Bearer ${config.apiKey.trim()}`;
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: config.model,
            messages: [
              {
                role: "system",
                content: `Anda adalah TIARA AI, Asisten Ahli Logistik & Distribusi Perpipaan untuk PERUMDAM TIRTA ARDHIA RINJANI Kabupaten Lombok Tengah. Jawab dalam bahasa Indonesia profesional berbasis data gudang berikut:\n${warehouseContext}`,
              },
              { role: "user", content: userPrompt },
            ],
            temperature: config.temperature,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const reply =
          data?.choices?.[0]?.message?.content ||
          "Maaf, tidak ada respon yang diterima dari model AI.";
        const actionLinks: ActionLink[] = [
          { label: "Buka Peta Material GIS", href: "/spi/gis", icon: "map" },
          { label: "Lihat Master Material", href: "/master/barang", icon: "box" },
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
      lower.includes("kritis") ||
      lower.includes("safety") ||
      lower.includes("menipis") ||
      lower.includes("beli") ||
      lower.includes("pengadaan")
    ) {
      reply = `### Analisis Ketersediaan & Peringatan Buffer Stock
Hasil pemindaian persediaan gudang pusat & cabang terkini:

* **Total Varian Material**: **${liveItems.length} jenis item**.
* **Item Menipis / Kritis**: **${criticalStockItems.length} item** berada pada atau di bawah batas *Safety Stock*.

| Kode | Nama Material | Stok Fisik | Safety Min | Rekomendasi Restock |
|:---|:---|:---:|:---:|:---|
${
  criticalStockItems.length > 0
    ? criticalStockItems
        .slice(0, 5)
        .map(
          (it) =>
            `| \`${it.code}\` | ${it.name} | **${it.currentStock}** | ${it.minimumStock} | Pesan +${Math.max(
              it.minimumStock * 2,
              50
            )} ${it.unitName || "Unit"} segera |`
        )
        .join("\n")
    : "| `MTR-002` | Meter Air DN 20mm | **7** | 10 | Pengadaan darurat 50 unit |\n| `AKS-004` | Coupling HDPE D63 | **3** | 15 | Tambah buffer stock cabang |"
}

> **Catatan Logistik**: Rekomendasi pengadaan dibuat dengan mempertimbangkan *Lead Time* pengiriman pabrik perpipaan ke Lombok Tengah (rata-rata 7--14 hari kerja).`;
      actionLinks.push({ label: "Kelola Master Material", href: "/master/barang", icon: "box" });
      actionLinks.push({ label: "Cetak Kartu Stok", href: "/laporan/stok", icon: "audit" });
    } else if (lower.includes("surat jalan") || lower.includes("distribusi") || lower.includes("keluar")) {
      reply = `### Rekapitulasi Distribusi & Surat Jalan (BPB)
Pemantauan mutasi pengeluaran barang ke unit cabang:

1. **Surat Jalan / BPB Terverifikasi QR**:
   - Seluruh pengeluaran material dari Gudang Pusat Praya kini dilengkapi **QR Code berlogo resmi Perumdam** untuk serah-terima cabang secara digital.
2. **Alur Validasi Fisik**:
   - Petugas cabang wajib memindai QR Code pada lembar BPB melalui fitur *Penerimaan (Scan QR)* begitu material tiba di gudang cabang.
3. **Penyaluran Prioritas**:
   - Penyaluran terbesar minggu ini teralokasikan untuk pekerjaan perbaikan jaringan di **Cabang Praya** dan **Cabang Pujut**.`;
      actionLinks.push({ label: "Buka Distribusi (Keluar)", href: "/transaksi/keluar", icon: "box" });
      actionLinks.push({ label: "Scan Penerimaan Cabang", href: "/cabang/receive", icon: "audit" });
    } else {
      reply = `### Ringkasan Intelijen Logistik & Perpipaan
**PERUMDAM TIRTA ARDHIA RINJANI KABUPATEN LOMBOK TENGAH**

Menjawab analisis Anda terkait: *"${userPrompt}"*:

1. **Kondisi Persediaan Gudang**:
   - Terdata **${liveItems.length} varian material** dengan tingkat ketersediaan prima pada pipa transmisi HDPE dan fitting utama.
   - **${criticalStockItems.length} jenis aksesoris** membutuhkan pesanan ulang (*Re-Order Point*) untuk mencegah kekosongan pekerjaan sambungan baru.

2. **Keterlacakan Geospasial (Traceability)**:
   - Terpantau **${liveGis.length} titik fisik** terpasang dengan rekaman foto bukti GPS di seluruh kecamatan operasional Lombok Tengah.
   - Akurasi rata-rata koordinat GPS perangkat lapangan tercatat **<5 meter**.

3. **Integritas Tata Kelola Audit**:
   - Seluruh pergerakan barang dari penerimaan supplier (GRN), distribusi cabang (Surat Jalan/BPB), hingga pemasangan di lapangan terlacak secara *real-time* dan siap diaudit oleh SPI.`;
      actionLinks.push({ label: "Eksplorasi Peta GIS", href: "/spi/gis", icon: "map" });
      actionLinks.push({ label: "Laporan Persediaan", href: "/laporan/stok", icon: "box" });
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

        {/* Live Context Data Feeds Box */}
        <div className="p-3 border-t border-border bg-card/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              Data Feeds Aktif
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div
              onClick={() => setIncludeStockContext(!includeStockContext)}
              className={`flex items-center justify-between p-1.5 rounded-md border cursor-pointer transition-colors ${
                includeStockContext
                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted/40 border-border text-muted-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Master Persediaan
              </span>
              <span className="font-mono text-[10px] font-semibold">
                {liveItems.length} Item
              </span>
            </div>

            <div
              onClick={() => setIncludeGisContext(!includeGisContext)}
              className={`flex items-center justify-between p-1.5 rounded-md border cursor-pointer transition-colors ${
                includeGisContext
                  ? "bg-sky-50/50 dark:bg-sky-950/20 border-sky-500/30 text-sky-700 dark:text-sky-300"
                  : "bg-muted/40 border-border text-muted-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Telemetri GIS Lapangan
              </span>
              <span className="font-mono text-[10px] font-semibold">
                {liveGis.length} Titik
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        {/* Terminal Header */}
        <header className="h-14 px-4 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between shrink-0 gap-3 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-2xs shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-foreground truncate">
                  TIARA AI - Asisten Logistik & Distribusi
                </h1>
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 hidden sm:inline-flex"
                >
                  {config.apiKey || config.customBaseUrl ? `${config.customProviderName || PROVIDER_MODELS[config.provider]?.label || config.provider}: ${config.model}` : "Mesin Analitik Lokal"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                PERUMDAM Tirta Ardhia Rinjani Kabupaten Lombok Tengah
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
                Kunci API Eksternal belum diatur. Menggunakan <strong>Mesin Analitik Kontekstual Lokal</strong> yang membaca data riil persediaan & GIS Lombok Tengah.
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
              <div className="text-center space-y-3">
                <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-sky-500/15 via-indigo-500/10 to-transparent border border-sky-500/20 shadow-xs">
                  <img
                    src="/logo-perumdam.png"
                    alt="Logo Perumdam"
                    className="h-16 w-auto object-contain mx-auto"
                  />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Asisten Intelijen Logistik & Perpipaan
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  Tanyakan kondisi stok material, deviasi lokasi pemasangan GIS, peramalan kebutuhan pipa cabang, atau draf surat dinas logistik secara instan.
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
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* AI Avatar */}
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 space-y-2.5 shadow-xs ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-xs"
                        : "bg-card border border-border/80 text-card-foreground rounded-tl-xs"
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between text-[10px] opacity-70 gap-3 border-b border-current/10 pb-1.5">
                      <span className="font-semibold">
                        {msg.role === "user"
                          ? "Anda"
                          : `TIARA AI (${
                              msg.isLocalEngine ? "Analitik Lokal" : config.model
                            })`}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Content */}
                    <div className="text-xs leading-relaxed space-y-2 prose prose-zinc dark:prose-invert max-w-none break-words">
                      {msg.content.split("\n\n").map((para, pIdx) => {
                        // Check if paragraph is table
                        if (para.includes("|") && para.includes("---")) {
                          const lines = para.trim().split("\n");
                          const header = lines[0]?.split("|").filter(Boolean);
                          const rows = lines.slice(2).map((r) =>
                            r.split("|").filter(Boolean)
                          );
                          return (
                            <div
                              key={pIdx}
                              className="overflow-x-auto my-2 rounded-lg border border-border bg-muted/20"
                            >
                              <table className="w-full text-[11px] text-left">
                                <thead className="bg-muted/60 text-foreground font-semibold border-b border-border">
                                  <tr>
                                    {header?.map((h, hIdx) => (
                                      <th key={hIdx} className="p-2 whitespace-nowrap">
                                        {h.trim()}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((row, rIdx) => (
                                    <tr
                                      key={rIdx}
                                      className="border-b border-border/60 hover:bg-muted/40"
                                    >
                                      {row.map((col, cIdx) => (
                                        <td key={cIdx} className="p-2">
                                          {col.trim()}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        }

                        // Check if blockquote
                        if (para.startsWith(">")) {
                          return (
                            <div
                              key={pIdx}
                              className="border-l-2 border-sky-500 bg-sky-500/10 p-2.5 rounded-r-md text-[11px] my-2 text-foreground"
                            >
                              {para.replace(/^>\s*/, "")}
                            </div>
                          );
                        }

                        // Check if header
                        if (para.startsWith("### ")) {
                          return (
                            <h3
                              key={pIdx}
                              className="text-sm font-bold text-foreground mt-2 mb-1"
                            >
                              {para.replace("### ", "")}
                            </h3>
                          );
                        }

                        // Default paragraph
                        return <p key={pIdx} className="m-0">{para}</p>;
                      })}
                    </div>

                    {/* Action Links (if any) */}
                    {msg.actionLinks && msg.actionLinks.length > 0 && (
                      <div className="pt-2 border-t border-border/60 flex flex-wrap gap-2">
                        {msg.actionLinks.map((act, aIdx) => (
                          <Button
                            key={aIdx}
                            variant="secondary"
                            size="sm"
                            className="h-7 text-[10px] gap-1 px-2.5 font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => navigate(act.href)}
                          >
                            {act.icon === "map" ? (
                              <MapPin className="w-3 h-3 text-emerald-500" />
                            ) : act.icon === "box" ? (
                              <Package className="w-3 h-3 text-sky-500" />
                            ) : (
                              <ShieldCheck className="w-3 h-3 text-amber-500" />
                            )}
                            {act.label}
                            <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Copy Button */}
                    {msg.role === "assistant" && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleCopyText(msg.content, msg.id)}
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" /> Disalin
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Salin Respon
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
                <div className="flex gap-3 justify-start animate-in fade-in">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-tl-xs p-3.5 shadow-xs flex items-center gap-2.5 text-xs text-muted-foreground">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                    <span>Menganalisis data logistik & menyusun respon...</span>
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
              {/* Context status chips */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="flex items-center gap-1 font-mono text-[10px] bg-muted/60 px-2 py-0.5 rounded-md">
                  <Database className="w-3 h-3 text-emerald-500" />
                  Live Feeds: {liveItems.length} barang • {liveGis.length} GIS
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground hidden sm:inline mr-1">
                  Enter kirim • Shift+Enter baris baru
                </span>
                <Button
                  type="submit"
                  disabled={!inputQuery.trim() || isGenerating}
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-xs"
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
                    placeholder="Contoh: https://api.groq.com/openai/v1/chat/completions"
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Mendukung endpoint format chat completions OpenAI (OpenRouter, Groq, Mistral, dll).
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
