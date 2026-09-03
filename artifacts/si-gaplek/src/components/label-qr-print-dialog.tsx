import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, X, Tag, SlidersHorizontal, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface LabelItem {
  id: number;
  code: string;
  name: string;
  barcode?: string | null;
  categoryName?: string;
  unitName?: string;
  locationName?: string;
  rackCode?: string;
}

interface LabelQrPrintDialogProps {
  items: LabelItem[];
  open: boolean;
  onClose: () => void;
}

export function LabelQrPrintDialog({ items, open, onClose }: LabelQrPrintDialogProps) {
  const [layoutMode, setLayoutMode] = useState<"thermal" | "sheet">("sheet");
  const [copies, setCopies] = useState<number>(1);

  if (!items || items.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  // Generate label items multiplied by copies
  const printItems: LabelItem[] = [];
  for (let c = 0; c < copies; c++) {
    printItems.push(...items);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden border-border shadow-2xl">
        {/* Header & Controls (Hidden on Print) */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-card print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Cetak Stiker Label QR Material & Rak</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {items.length} material dipilih • Total {printItems.length} label
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrint}
                size="sm"
                className="gap-1.5 bg-sky-700 hover:bg-sky-800 text-white shadow-xs text-xs font-medium"
              >
                <Printer className="w-4 h-4" /> Cetak Sekarang
              </Button>
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                <X className="w-4 h-4" /> Tutup
              </Button>
            </div>
          </div>

          {/* Options toolbar */}
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-border/60 text-xs">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Format Kertas:</Label>
              <Select value={layoutMode} onValueChange={(v: "thermal" | "sheet") => setLayoutMode(v)}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sheet">Lembar A4 (Grid 3x7 Label)</SelectItem>
                  <SelectItem value="thermal">Thermal Stiker (50x30 mm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Jumlah Salinan per Item:</Label>
              <Select value={copies.toString()} onValueChange={(v) => setCopies(parseInt(v, 10))}>
                <SelectTrigger className="h-8 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="3">3x</SelectItem>
                  <SelectItem value="5">5x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        {/* ── Printable Labels Container ── */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/30 dark:bg-zinc-950/60 print:p-0 print:bg-white flex justify-center">
          {layoutMode === "sheet" ? (
            /* Sheet Mode (A4 Grid 3 columns) */
            <div className="w-full max-w-[800px] bg-white text-zinc-900 p-6 rounded-lg shadow-sm print:shadow-none print:p-0 print:border-0 border border-zinc-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-3 print:gap-2">
                {printItems.map((item, index) => (
                  <div
                    key={index}
                    className="border border-zinc-400 p-2.5 rounded-sm bg-white text-black flex flex-col justify-between h-[120px] print:h-[110px] print:break-inside-avoid shadow-2xs print:shadow-none"
                  >
                    <div className="border-b border-zinc-300 pb-1">
                      <p className="text-[8px] font-black uppercase tracking-wider text-zinc-800 leading-tight">
                        PERUMDAM TIRTA ARDHIA
                      </p>
                      <p className="text-[10px] font-bold text-zinc-950 truncate leading-snug">
                        {item.name}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <div className="space-y-0.5 text-[9px] min-w-0">
                        <p className="font-mono font-bold text-zinc-900 truncate">
                          {item.code}
                        </p>
                        <p className="text-zinc-600 truncate text-[8px]">
                          {item.categoryName || "Aksesoris"}
                        </p>
                        <p className="text-zinc-500 font-mono text-[8px] truncate">
                          {item.rackCode ? `Rak: ${item.rackCode}` : `Satuan: ${item.unitName || "Buah"}`}
                        </p>
                      </div>

                      <div className="shrink-0 bg-white p-0.5 border border-zinc-200 rounded">
                        <QRCodeSVG
                          value={item.barcode || item.code}
                          size={54}
                          level="H"
                          bgColor="#ffffff"
                          fgColor="#000000"
                          imageSettings={{
                            src: "/logo-qr-icon.png",
                            height: 14,
                            width: 14,
                            excavate: true,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Thermal Mode (Compact 50x30 mm layout) */
            <div className="w-full max-w-[400px] space-y-3 print:space-y-0">
              {printItems.map((item, index) => (
                <div
                  key={index}
                  className="w-full bg-white text-zinc-900 border-2 border-zinc-800 p-2 rounded flex items-center justify-between gap-2 h-[110px] print:h-[110px] print:break-after-page print:border-0"
                >
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <img src="/logo-perumdam.png" alt="Logo" className="h-3.5 w-auto object-contain shrink-0" />
                      <p className="text-[7px] font-black uppercase tracking-wider text-zinc-700 leading-none">
                        PERUMDAM LOMBOK TENGAH
                      </p>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-900 line-clamp-2 leading-tight">
                      {item.name}
                    </p>
                    <p className="text-[9px] font-mono font-extrabold text-zinc-950 pt-0.5">
                      {item.code}
                    </p>
                    <p className="text-[7.5px] text-zinc-600 font-mono truncate">
                      {item.categoryName || "-"} • {item.unitName || "Buah"}
                    </p>
                  </div>

                  <div className="shrink-0 bg-white p-1 border border-zinc-300 rounded flex flex-col items-center">
                    <QRCodeSVG
                      value={item.barcode || item.code}
                      size={66}
                      level="H"
                      bgColor="#ffffff"
                      fgColor="#000000"
                      imageSettings={{
                        src: "/logo-qr-icon.png",
                        height: 17,
                        width: 17,
                        excavate: true,
                      }}
                    />
                    <span className="text-[7px] font-mono text-zinc-500 mt-0.5 font-bold">
                      {item.barcode || item.code}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
