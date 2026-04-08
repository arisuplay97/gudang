import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Layout from "@/components/layout";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import BarangPage from "@/pages/master/barang";
import KategoriPage from "@/pages/master/kategori";
import SatuanPage from "@/pages/master/satuan";
import SupplierPage from "@/pages/master/supplier";
import GudangPage from "@/pages/master/gudang";
import LokasiPage from "@/pages/master/lokasi";
import DepartemenPage from "@/pages/master/departemen";
import BarangMasukPage from "@/pages/transaksi/masuk";
import BarangKeluarPage from "@/pages/transaksi/keluar";
import MutasiPage from "@/pages/transaksi/mutasi";
import PenyesuaianPage from "@/pages/transaksi/penyesuaian";
import OpnamePage from "@/pages/transaksi/opname";
import ReturPage from "@/pages/transaksi/retur";
import LaporanStokPage from "@/pages/laporan/stok";
import LaporanTransaksiPage from "@/pages/laporan/transaksi";
import LaporanNilaiPage from "@/pages/laporan/nilai";
import LogAktivitasPage from "@/pages/laporan/log";
import PenggunaPage from "@/pages/pengguna";
import NotFound from "@/pages/not-found";
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
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/master/barang" component={BarangPage} />
        <Route path="/master/kategori" component={KategoriPage} />
        <Route path="/master/satuan" component={SatuanPage} />
        <Route path="/master/supplier" component={SupplierPage} />
        <Route path="/master/gudang" component={GudangPage} />
        <Route path="/master/lokasi" component={LokasiPage} />
        <Route path="/master/departemen" component={DepartemenPage} />
        <Route path="/transaksi/masuk" component={BarangMasukPage} />
        <Route path="/transaksi/keluar" component={BarangKeluarPage} />
        <Route path="/transaksi/mutasi" component={MutasiPage} />
        <Route path="/transaksi/penyesuaian" component={PenyesuaianPage} />
        <Route path="/transaksi/opname" component={OpnamePage} />
        <Route path="/transaksi/retur" component={ReturPage} />
        <Route path="/laporan/stok" component={LaporanStokPage} />
        <Route path="/laporan/transaksi" component={LaporanTransaksiPage} />
        <Route path="/laporan/nilai" component={LaporanNilaiPage} />
        <Route path="/laporan/log" component={LogAktivitasPage} />
        <Route path="/pengguna" component={PenggunaPage} />
        <Route path="/login"><Redirect to="/" /></Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
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
  );
}

export default App;
