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
                level="M"
                bgColor="transparent"
                fgColor="currentColor"
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
            className="flex flex-col items-center gap-1 p-4 bg-white text-black"
            id="barcode-print-label"
        >
            <p className="text-[10px] font-bold text-center tracking-wider uppercase leading-tight">
                PERUMDAM TIRTA ARDHIA
            </p>
            <p className="text-[10px] font-bold text-center tracking-wider uppercase leading-none mb-1">
                RINJANI
            </p>
            <p className="text-sm font-semibold text-center leading-tight">
                {itemName}
            </p>
            <p className="text-xs font-mono text-gray-600">{itemCode}</p>
            <QRCodeSVG
                value={barcode}
                size={160}
                level="H"
                bgColor="#ffffff"
                fgColor="#000000"
            />
            <p className="text-xs font-mono">{barcode}</p>
        </div>
    );
}
