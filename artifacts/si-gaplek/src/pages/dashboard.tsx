import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  PackagePlus,
  PackageMinus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  DollarSign,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface DashboardSummary {
  totalItems: number;
  totalStockIn: number;
  totalStockOut: number;
  lowStockCount: number;
  inventoryValue: number;
  recentTransactions: Array<{
    id: number;
    type: string;
    referenceNumber: string;
    itemName: string;
    quantity: number;
    date: string;
  }>;
  stockMovement: Array<{
    date: string;
    stockIn: number;
    stockOut: number;
  }>;
  lowStockItems: Array<{
    id: number;
    code: string;
    name: string;
    currentStock: number;
    minimumStock: number;
    unit: string;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardSummary>("/api/dashboard"),
  });

  const stats = [
    {
      label: "Total Barang",
      value: formatNumber(data?.totalItems),
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
      desc: "jenis barang terdaftar",
    },
    {
      label: "Barang Masuk",
      value: formatNumber(data?.totalStockIn),
      icon: PackagePlus,
      color: "text-green-600",
      bg: "bg-green-50",
      desc: "transaksi bulan ini",
    },
    {
      label: "Barang Keluar",
      value: formatNumber(data?.totalStockOut),
      icon: PackageMinus,
      color: "text-red-600",
      bg: "bg-red-50",
      desc: "transaksi bulan ini",
    },
    {
      label: "Stok Rendah",
      value: formatNumber(data?.lowStockCount),
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      desc: "barang perlu reorder",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Selamat datang, {user?.fullName}. Berikut ringkasan sistem hari ini.
        </p>
      </div>

      {data?.lowStockCount != null && data.lowStockCount > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            Terdapat <strong>{data.lowStockCount} barang</strong> dengan stok di bawah minimum. Segera lakukan pengadaan.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold mt-1">{s.value}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Value + Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pergerakan Stok (7 Hari Terakhir)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.stockMovement ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="stockIn" name="Masuk" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="stockOut" name="Keluar" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Nilai Inventaris
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(data?.inventoryValue ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total nilai stok saat ini</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : data?.recentTransactions?.length ? (
              <div className="space-y-2">
                {data.recentTransactions.slice(0, 8).map((t) => (
                  <div key={`${t.type}-${t.id}`} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      t.type === "stock_in" ? "bg-green-100" : t.type === "stock_out" ? "bg-red-100" : "bg-blue-100"
                    }`}>
                      {t.type === "stock_in" ? <PackagePlus className="w-4 h-4 text-green-600" /> :
                       t.type === "stock_out" ? <PackageMinus className="w-4 h-4 text-red-600" /> :
                       <ArrowLeftRight className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.itemName}</p>
                      <p className="text-xs text-muted-foreground">{t.referenceNumber}</p>
                    </div>
                    <Badge variant={t.type === "stock_in" ? "default" : "destructive"} className="shrink-0 text-xs">
                      {t.type === "stock_in" ? "+" : "-"}{t.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Belum ada transaksi</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Stok Rendah
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : data?.lowStockItems?.length ? (
              <div className="space-y-2">
                {data.lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.code}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-red-600">{item.currentStock} {item.unit}</p>
                      <p className="text-xs text-muted-foreground">min: {item.minimumStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Semua stok aman</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
