import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, SlidersHorizontal, Download, Columns3, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
    label: string;
    value: string;
}

interface DataTableToolbarProps {
    /** Search */
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;

    /** Status filter */
    statusOptions?: FilterOption[];
    statusValue?: string;
    onStatusChange?: (value: string) => void;

    /** Custom select filters */
    extraFilters?: {
        label: string;
        options: FilterOption[];
        value: string;
        onChange: (value: string) => void;
    }[];

    /** Column visibility */
    columns?: { id: string; label: string; visible: boolean }[];
    onColumnToggle?: (columnId: string) => void;

    /** Export */
    onExport?: () => void;

    /** Reset */
    hasActiveFilters?: boolean;
    onReset?: () => void;

    className?: string;
}

/**
 * Reusable data table toolbar with search, filters, column visibility, and export.
 * Section 29, 30 of the blueprint.
 */
export default function DataTableToolbar({
    searchValue,
    onSearchChange,
    searchPlaceholder = "Cari...",
    statusOptions,
    statusValue,
    onStatusChange,
    extraFilters,
    columns,
    onColumnToggle,
    onExport,
    hasActiveFilters,
    onReset,
    className,
}: DataTableToolbarProps) {
    return (
        <div className={cn("flex flex-col sm:flex-row sm:items-center gap-3 mb-4", className)}>
            {/* Search */}
            {onSearchChange && (
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={searchValue ?? ""}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="pl-9 h-9"
                    />
                </div>
            )}

            {/* Status filter */}
            {statusOptions && onStatusChange && (
                <Select value={statusValue ?? "all"} onValueChange={onStatusChange}>
                    <SelectTrigger className="w-[160px] h-9">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        {statusOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* Extra filters */}
            {extraFilters?.map((filter) => (
                <Select key={filter.label} value={filter.value} onValueChange={filter.onChange}>
                    <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder={filter.label} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua {filter.label}</SelectItem>
                        {filter.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ))}

            <div className="flex items-center gap-2 ml-auto">
                {/* Column visibility */}
                {columns && onColumnToggle && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1.5">
                                <Columns3 className="w-4 h-4" />
                                <span className="hidden sm:inline">Kolom</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {columns.map((col) => (
                                <DropdownMenuCheckboxItem
                                    key={col.id}
                                    checked={col.visible}
                                    onCheckedChange={() => onColumnToggle(col.id)}
                                >
                                    {col.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* Export */}
                {onExport && (
                    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onExport}>
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export</span>
                    </Button>
                )}

                {/* Reset filters */}
                {hasActiveFilters && onReset && (
                    <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={onReset}>
                        <X className="w-4 h-4" />
                        Reset
                    </Button>
                )}
            </div>
        </div>
    );
}
