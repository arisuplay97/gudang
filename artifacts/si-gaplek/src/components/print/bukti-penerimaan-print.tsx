import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatNumber, formatCurrency } from "@/lib/utils";

export interface BuktiPenerimaanItem {
  id?: number;
  itemCode?: string;
  itemName: string;
  quantity: number;
  unitName?: string;
  unitPrice?: number;
  locationName?: string;
  notes?: string | null;
}

export interface BuktiPenerimaanData {
  id: number | string;
  referenceNo: string;
  transactionDate: string;
  supplierName?: string | null;
  warehouseName?: string | null;
  createdByName?: string | null;
  notes?: string | null;
  items: BuktiPenerimaanItem[];
}

interface BuktiPenerimaanPrintProps {
  open: boolean;
  onClose: () => void;
  data: BuktiPenerimaanData | null;
}

export function BuktiPenerimaanPrintModal({ open, onClose, data }: BuktiPenerimaanPrintProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = data.transactionDate
    ? new Date(data.transactionDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

  const totalQty = data.items?.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) || 0;
  const grandTotal = data.items?.reduce((sum, it) => sum + ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border-0 bg-transparent shadow-2xl">
        {/* Top Floating Actions (Hidden on Print) */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-card border-b border-border/80 shadow-xs print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold">Cetak Bukti Penerimaan Barang (GRN)</h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {data.referenceNo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs text-xs font-medium"
            >
              <Printer className="w-4 h-4" /> Cetak Sekarang (A4)
            </Button>
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              <X className="w-4 h-4" /> Tutup
            </Button>
          </div>
        </div>

        {/* ── Printable Paper Document (A4 Styling) ── */}
        <div className="p-4 sm:p-6 bg-muted/40 dark:bg-zinc-950/60 print:p-0 print:bg-white flex justify-center">
          <div
            ref={printAreaRef}
            className="w-full max-w-[800px] bg-white text-zinc-900 p-8 sm:p-10 rounded-lg shadow-md border border-zinc-200 print:border-0 print:shadow-none print:p-6 print:rounded-none font-sans"
          >
            {/* 1. Header / Kop Surat Resmi */}
            <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-4 mb-4">
              <div className="flex items-center gap-3.5">
                <img
                  src="/logo-perumdam.png"
                  alt="Logo Perumdam"
                  className="h-16 w-auto object-contain shrink-0"
                />
                <div>
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-zinc-900 uppercase leading-none">
                    PERUMDAM TIRTA ARDHIA RINJANI
                  </h1>
                  <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mt-0.5">
                    KABUPATEN LOMBOK TENGAH
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1 leading-tight">
                    Divisi Pengadaan & Gudang Logistik • Jl. Pariwisata No. 1 Praya, Lombok Tengah
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-2 bg-zinc-50 border border-zinc-200 rounded-md shrink-0">
                <QRCodeSVG
                  value={`GRN-${data.referenceNo}`}
                  size={72}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                  imageSettings={{
                    src: "/logo-qr-icon.png",
                    height: 18,
                    width: 18,
                    excavate: true,
                  }}
                />
                <span className="text-[8px] font-mono text-zinc-600 mt-1 font-bold">
                  {data.referenceNo}
                </span>
              </div>
            </div>

            {/* 2. Document Title */}
            <div className="text-center my-4">
              <h2 className="text-base font-extrabold uppercase tracking-wider text-zinc-900 underline underline-offset-4 decoration-zinc-800">
                BUKTI PENERIMAAN BARANG (GOOD RECEIPT NOTE)
              </h2>
              <p className="text-xs font-mono font-medium text-zinc-600 mt-1">
                NOMOR BUKTI: {data.referenceNo}
              </p>
            </div>

            {/* 3. Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs border border-zinc-300 rounded-md p-3 mb-5 bg-zinc-50/50">
              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-32 text-zinc-500 font-medium">Supplier / Rekanan:</span>
                  <span className="font-bold text-zinc-900">{data.supplierName || "Pengadaan Langsung"}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-zinc-500 font-medium">Gudang Penerima:</span>
                  <span className="font-semibold text-emerald-900">{data.warehouseName || "Gudang Utama Mataram"}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-zinc-500 font-medium">Keterangan / SP:</span>
                  <span className="font-medium text-zinc-800">{data.notes || "Pengadaan Material Perpipaan"}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-32 text-zinc-500 font-medium">Tanggal Diterima:</span>
                  <span className="font-semibold text-zinc-900">{formattedDate}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-zinc-500 font-medium">Pemeriksa Fisik:</span>
                  <span className="font-medium text-zinc-800">{data.createdByName || "Petugas Penerimaan"}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-zinc-500 font-medium">Status Dokumen:</span>
                  <span className="font-bold text-emerald-800 uppercase text-[11px]">
                    LENGKAP & MASUK STOK
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Table of Items */}
            <div className="mb-6">
              <table className="w-full border-collapse text-xs border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-800 border-b border-zinc-300">
                    <th className="py-2 px-2.5 text-center font-bold border-r border-zinc-300 w-10">NO</th>
                    <th className="py-2 px-3 text-left font-bold border-r border-zinc-300 w-28">KODE</th>
                    <th className="py-2 px-3 text-left font-bold border-r border-zinc-300">NAMA MATERIAL</th>
                    <th className="py-2 px-3 text-center font-bold border-r border-zinc-300 w-20">JUMLAH</th>
                    <th className="py-2 px-3 text-center font-bold border-r border-zinc-300 w-20">SATUAN</th>
                    <th className="py-2 px-3 text-right font-bold w-28">HARGA SATUAN</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items && data.items.length > 0 ? (
                    data.items.map((item, index) => (
                      <tr key={index} className="border-b border-zinc-200">
                        <td className="py-2 px-2.5 text-center border-r border-zinc-300 font-mono text-zinc-600">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3 font-mono text-zinc-700 border-r border-zinc-300">
                          {item.itemCode || "-"}
                        </td>
                        <td className="py-2 px-3 font-semibold text-zinc-900 border-r border-zinc-300">
                          {item.itemName}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-zinc-900 border-r border-zinc-300 text-sm">
                          {formatNumber(item.quantity)}
                        </td>
                        <td className="py-2 px-3 text-center text-zinc-700 border-r border-zinc-300">
                          {item.unitName || "Buah"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-zinc-800">
                          {item.unitPrice ? formatCurrency(item.unitPrice) : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-zinc-400 italic">
                        Tidak ada barang pada penerimaan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-50 font-bold border-t border-zinc-300 text-zinc-900">
                    <td colSpan={3} className="py-2 px-3 text-right border-r border-zinc-300">
                      TOTAL KUANTITAS FISIK:
                    </td>
                    <td className="py-2 px-3 text-center border-r border-zinc-300 text-sm">
                      {formatNumber(totalQty)}
                    </td>
                    <td className="py-2 px-3 text-zinc-500 font-normal text-[11px] text-center border-r border-zinc-300">
                      {data.items?.length || 0} Item
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs">
                      {grandTotal > 0 ? formatCurrency(grandTotal) : "-"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5. Signatures */}
            <div className="grid grid-cols-3 gap-4 text-center text-xs mt-8 pt-2">
              <div>
                <p className="text-zinc-600 font-medium mb-16">
                  Diserahkan Oleh,<br />
                  <span className="font-semibold text-zinc-800">Supplier / Rekanan</span>
                </p>
                <div className="border-t border-zinc-800 mx-4 pt-1 font-bold text-zinc-900">
                  ( {data.supplierName || "..............................."} )
                </div>
              </div>

              <div>
                <p className="text-zinc-600 font-medium mb-16">
                  Diterima & Diperiksa Oleh,<br />
                  <span className="font-semibold text-zinc-800">Petugas Gudang Penerimaan</span>
                </p>
                <div className="border-t border-zinc-800 mx-4 pt-1 font-bold text-zinc-900">
                  ( {data.createdByName || "..............................."} )
                </div>
              </div>

              <div>
                <p className="text-zinc-600 font-medium mb-16">
                  Mengetahui,<br />
                  <span className="font-semibold text-zinc-800">Kepala Bagian Logistik</span>
                </p>
                <div className="border-t border-zinc-800 mx-4 pt-1 font-bold text-zinc-900">
                  ( ............................... )
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
