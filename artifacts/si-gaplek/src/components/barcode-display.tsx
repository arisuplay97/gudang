import { QRCodeSVG } from "qrcode.react";

interface BarcodeDisplayProps {
    value: string;
    size?: number;
    showValue?: boolean;
    className?: string;
}

/**
 * Renders a QR Code for material identification.
 * - Thumbnail mode (default size=36): compact for table cells
 * - Full mode (size=160+): for detail dialogs
 */
export function BarcodeDisplay({
    value,
    size = 64,
    showValue = false,
    className = "",
}: BarcodeDisplayProps) {
    if (!value) return null;
    return (
        <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
            <QRCodeSVG
                value={value}
                size={size}
                level="H"
                bgColor="transparent"
                fgColor="currentColor"
                imageSettings={size >= 48 ? {
                    src: "/logo-qr-icon.png",
                    height: Math.round(size * 0.25),
                    width: Math.round(size * 0.25),
                    excavate: true,
                } : undefined}
            />
            {showValue && (
                <span className="text-[10px] font-mono text-muted-foreground leading-none">
                    {value}
                </span>
            )}
        </div>
    );
}

/**
 * Render QR Code label for printing.
 * Includes "PERUMDAM TIRTA ARDHIA RINJANI" company header.
 */
export function BarcodePrintLabel({
    itemName,
    itemCode,
    barcode,
}: {
    itemName: string;
    itemCode: string;
    barcode: string;
}) {
    return (
        <div
            className="flex flex-col items-center justify-between text-center aspect-square w-[230px] p-3.5 bg-white text-black border-2 border-zinc-900 rounded-lg shadow-xs"
            id="barcode-print-label"
        >
            <div className="w-full pb-1 border-b border-zinc-300">
                <p className="text-[9px] font-black uppercase tracking-wider text-zinc-700 leading-tight">
                    PERUMDAM TIRTA ARDHIA
                </p>
                <p className="text-xs font-bold text-zinc-950 line-clamp-2 leading-snug mt-0.5">
                    {itemName}
                </p>
            </div>
            <div className="w-full py-1">
                <p className="text-sm font-mono font-black tracking-widest text-zinc-950 uppercase">
                    {itemCode}
                </p>
            </div>
            <div className="p-1.5 bg-white border border-zinc-300 rounded-md flex items-center justify-center">
                <QRCodeSVG
                    value={barcode}
                    size={120}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#000000"
                    imageSettings={{
                        src: "/logo-qr-icon.png",
                        height: 32,
                        width: 32,
                        excavate: true,
                    }}
                />
            </div>
        </div>
    );
}
