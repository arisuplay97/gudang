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
import BarangMasukPage from "@/pages/transaksi/masuk";
import BarangKeluarPage from "@/pages/transaksi/keluar";
import LaporanStokPage from "@/pages/laporan/stok";
import PenggunaPage from "@/pages/pengguna";
import NotFound from "@/pages/not-found";
import CabangReceivePage from "@/pages/cabang/receive";
import CabangPemasanganPage from "@/pages/cabang/pemasangan";
import CabangTrackingPage from "@/pages/cabang/tracking";
import SpiDashboardPage from "@/pages/spi/dashboard";
import SpiVerifikasiPage from "@/pages/spi/verifikasi";
import SpiGisPage from "@/pages/spi/gis";
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
        {/* Gudang Routes */}
        <Route path="/master/barang" component={BarangPage} />
        <Route path="/master/gudang" component={GudangPage} />
        <Route path="/transaksi/masuk" component={BarangMasukPage} />
        <Route path="/transaksi/keluar" component={BarangKeluarPage} />
        <Route path="/laporan/stok" component={LaporanStokPage} />

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
