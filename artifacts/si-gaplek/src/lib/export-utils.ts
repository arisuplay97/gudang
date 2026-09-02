/**
 * Export data to CSV and trigger browser download.
 * No external dependencies required.
 */

type CellValue = string | number | boolean | null | undefined;

export function exportToCSV(
    filename: string,
    headers: string[],
    rows: CellValue[][]
) {
    const escape = (val: CellValue): string => {
        if (val === null || val === undefined) return "";
        const str = String(val);
        // Wrap in quotes if it contains comma, newline, or quote
        if (str.includes(",") || str.includes("\n") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvContent = [
        headers.map(escape).join(","),
        ...rows.map(row => row.map(escape).join(",")),
    ].join("\n");

    // Add BOM for Excel UTF-8 compatibility
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
