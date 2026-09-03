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
            /* Sheet Mode (A4 Grid Square Labels) */
            <div className="w-full max-w-[860px] bg-white text-zinc-900 p-6 rounded-lg shadow-sm print:shadow-none print:p-0 print:border-0 border border-zinc-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-4 print:gap-3">
                {printItems.map((item, index) => (
                  <div
                    key={index}
                    className="border-2 border-zinc-900 p-3.5 rounded-lg bg-white text-black flex flex-col items-center justify-between text-center aspect-square shadow-xs print:shadow-none print:break-inside-avoid print:border-2"
                  >
                    {/* Header: Perumdam & Nama Barang */}
                    <div className="w-full pb-1.5 border-b border-zinc-300">
                      <p className="text-[9px] font-black uppercase tracking-wider text-zinc-700 leading-tight">
                        PERUMDAM TIRTA ARDHIA
                      </p>
                      <p className="text-xs font-bold text-zinc-950 line-clamp-2 leading-snug mt-0.5 px-1">
                        {item.name}
                      </p>
                    </div>

                    {/* Kode diatas barcode */}
                    <div className="w-full py-1">
                      <p className="text-sm font-mono font-black tracking-widest text-zinc-950 uppercase">
                        {item.code}
                      </p>
                    </div>

                    {/* Large QR Code with prominent center logo */}
                    <div className="p-1.5 bg-white border border-zinc-300 rounded-md flex items-center justify-center">
                      <QRCodeSVG
                        value={item.barcode || item.code}
                        size={110}
                        level="H"
                        bgColor="#ffffff"
                        fgColor="#000000"
                        imageSettings={{
                          src: "/logo-qr-icon.png",
                          height: 28,
                          width: 28,
                          excavate: true,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Thermal Mode (Square Sticker layout) */
            <div className="w-full max-w-[400px] space-y-4 print:space-y-0">
              {printItems.map((item, index) => (
                <div
                  key={index}
                  className="w-full max-w-[240px] aspect-square bg-white text-zinc-900 border-2 border-zinc-900 p-3.5 rounded-lg flex flex-col items-center justify-between text-center mx-auto print:w-[60mm] print:h-[60mm] print:break-after-page print:border-2"
                >
                  {/* Header */}
                  <div className="w-full pb-1.5 border-b border-zinc-300">
                    <p className="text-[9px] font-black uppercase tracking-wider text-zinc-700 leading-none">
                      PERUMDAM LOMBOK TENGAH
                    </p>
                    <p className="text-xs font-bold text-zinc-950 line-clamp-2 leading-tight mt-0.5">
                      {item.name}
                    </p>
                  </div>

                  {/* Kode diatas barcode */}
                  <div className="w-full py-1">
                    <p className="text-sm font-mono font-black tracking-widest text-zinc-950 uppercase">
                      {item.code}
                    </p>
                  </div>

                  {/* Large QR Code with prominent logo */}
                  <div className="p-1.5 bg-white border border-zinc-300 rounded flex items-center justify-center">
                    <QRCodeSVG
                      value={item.barcode || item.code}
                      size={115}
                      level="H"
                      bgColor="#ffffff"
                      fgColor="#000000"
                      imageSettings={{
                        src: "/logo-qr-icon.png",
                        height: 30,
                        width: 30,
                        excavate: true,
                      }}
                    />
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
