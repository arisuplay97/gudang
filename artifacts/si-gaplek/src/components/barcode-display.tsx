import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeDisplayProps {
    value: string;
    width?: number;
    height?: number;
    showValue?: boolean;
    className?: string;
}

/**
 * Renders a Code 128 barcode via JsBarcode.
 * - Thumbnail mode (default): compact barcode for table cells
 * - Full mode: pass larger width/height for detail dialogs
 */
export function BarcodeDisplay({
    value,
    width = 1.2,
    height = 30,
    showValue = false,
    className = "",
}: BarcodeDisplayProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !value) return;
        try {
            JsBarcode(svgRef.current, value, {
                format: "CODE128",
                width,
                height,
                displayValue: showValue,
                margin: 2,
                fontSize: 10,
                font: "monospace",
                background: "transparent",
                lineColor: "currentColor",
            });
        } catch {
            // If barcode generation fails, leave SVG empty
        }
    }, [value, width, height, showValue]);

    if (!value) return null;

    return (
        <div className={`inline-flex flex-col items-center gap-0.5 ${className}`}>
            <svg ref={svgRef} />
        </div>
    );
}

/**
 * Render barcode label for printing.
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
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !barcode) return;
        try {
            JsBarcode(svgRef.current, barcode, {
                format: "CODE128",
                width: 2,
                height: 60,
                displayValue: true,
                margin: 4,
                fontSize: 14,
                font: "monospace",
                background: "#ffffff",
                lineColor: "#000000",
            });
        } catch {
            // noop
        }
    }, [barcode]);

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
            <svg ref={svgRef} />
        </div>
    );
}
