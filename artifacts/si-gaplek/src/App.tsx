import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Layout from "@/components/layout";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import BarangPage from "@/pages/master/barang";
import GudangPage from "@/pages/master/gudang";
import KategoriPage from "@/pages/master/kategori";
import SatuanPage from "@/pages/master/satuan";
import SupplierPage from "@/pages/master/supplier";
import DepartemenPage from "@/pages/master/departemen";
import LokasiPage from "@/pages/master/lokasi";
import BarangMasukPage from "@/pages/transaksi/masuk";
import BarangKeluarPage from "@/pages/transaksi/keluar";
import OpnamePage from "@/pages/transaksi/opname";
import ReturPage from "@/pages/transaksi/retur";
import MutasiPage from "@/pages/transaksi/mutasi";
import PenyesuaianPage from "@/pages/transaksi/penyesuaian";
import LaporanStokPage from "@/pages/laporan/stok";
import LaporanTransaksiPage from "@/pages/laporan/transaksi";
import LaporanPemasanganAksesorisPage from "@/pages/laporan/pemasangan-aksesoris";
import LaporanNilaiPage from "@/pages/laporan/nilai";
import AuditLogPage from "@/pages/laporan/log";
import PenggunaPage from "@/pages/pengguna";
import NotFound from "@/pages/not-found";
import CabangReceivePage from "@/pages/cabang/receive";
import CabangPemasanganPage from "@/pages/cabang/pemasangan";
import CabangTrackingPage from "@/pages/cabang/tracking";
import SpiDashboardPage from "@/pages/spi/dashboard";
import SpiVerifikasiPage from "@/pages/spi/verifikasi";
import SpiGisPage from "@/pages/spi/gis";
import GlobalSearch from "@/components/global-search";
import NotificationCenter from "@/components/notification-center";
import ErrorBoundary from "@/components/error-boundary";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  },
});

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route><Redirect to="/login" /></Route>
      </Switch>
    );
  }

  return (
    <Layout>
      <GlobalSearch />
      <Switch>
        <Route path="/" component={DashboardPage} />
        {/* Gudang Routes - Master */}
        <Route path="/master/barang" component={BarangPage} />
        <Route path="/master/gudang" component={GudangPage} />
        <Route path="/master/kategori" component={KategoriPage} />
        <Route path="/master/satuan" component={SatuanPage} />
        <Route path="/master/supplier" component={SupplierPage} />
        <Route path="/master/departemen" component={DepartemenPage} />
        <Route path="/master/lokasi" component={LokasiPage} />
        {/* Gudang Routes - Transaksi */}
        <Route path="/transaksi/masuk" component={BarangMasukPage} />
        <Route path="/transaksi/keluar" component={BarangKeluarPage} />
        <Route path="/transaksi/opname" component={OpnamePage} />
        <Route path="/transaksi/retur" component={ReturPage} />
        <Route path="/transaksi/mutasi" component={MutasiPage} />
        <Route path="/transaksi/penyesuaian" component={PenyesuaianPage} />
        {/* Laporan */}
        <Route path="/laporan/stok" component={LaporanStokPage} />
        <Route path="/laporan/transaksi" component={LaporanTransaksiPage} />
        <Route path="/laporan/pemasangan-aksesoris" component={LaporanPemasanganAksesorisPage} />
        <Route path="/laporan/nilai" component={LaporanNilaiPage} />
        <Route path="/laporan/log" component={AuditLogPage} />

        {/* Cabang Routes */}
        <Route path="/cabang/receive" component={CabangReceivePage} />
        <Route path="/cabang/pemasangan" component={CabangPemasanganPage} />
        <Route path="/cabang/tracking" component={CabangTrackingPage} />

        {/* SPI Routes */}
        <Route path="/spi/dashboard" component={SpiDashboardPage} />
        <Route path="/spi/verifikasi" component={SpiVerifikasiPage} />
        <Route path="/spi/gis" component={SpiGisPage} />

        <Route path="/pengguna" component={PenggunaPage} />
        <Route path="/login"><Redirect to="/" /></Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppRouter />
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
