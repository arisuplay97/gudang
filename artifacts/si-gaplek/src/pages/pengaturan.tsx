import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { roleLabel } from "@/lib/utils";
import {
  getInstitutionProfile,
  saveInstitutionProfile,
  DEFAULT_INSTITUTION_PROFILE,
  type InstitutionProfile,
} from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Building2,
  Lock,
  KeyRound,
  ShieldCheck,
  Save,
  RotateCcw,
  Warehouse,
  CheckCircle2,
  Mail,
  UserCheck,
  FileCheck2,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PengaturanPage() {
  const { user, refetch } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  // Tab navigation from query param e.g. /pengaturan?tab=profil or /pengaturan?tab=instansi
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get("tab") || (location === "/profil" ? "profil" : "profil");
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    } else if (location === "/profil") {
      setActiveTab("profil");
    }
  }, [location]);

  // ── Tab 1 States: Profile & Security ──
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  // ── Tab 2 States: Institution & Signers ──
  const [instForm, setInstForm] = useState<InstitutionProfile>(getInstitutionProfile());
  const [instSaving, setInstSaving] = useState(false);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.fullName.trim()) {
      toast({
        title: "Nama Wajib Diisi",
        description: "Silakan masukkan nama lengkap Anda.",
        variant: "destructive",
      });
      return;
    }

    setProfileSaving(true);
    try {
      await apiFetch("/api/users/profile/me", {
        method: "PATCH",
        body: JSON.stringify(profileForm),
      });
      if (refetch) {
        await refetch();
      }
      toast({
        title: "Profil Berhasil Diperbarui",
        description: "Informasi nama dan email Anda telah tersimpan.",
      });
    } catch (err: any) {
      toast({
        title: "Gagal Memperbarui Profil",
        description: err.message || "Terjadi kesalahan saat menyimpan data.",
        variant: "destructive",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      toast({
        title: "Password Wajib Diisi",
        description: "Mohon isi password lama dan password baru.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Password Terlalu Pendek",
        description: "Password baru minimal harus 6 karakter.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Konfirmasi Password Tidak Cocok",
        description: "Password baru dan konfirmasi tidak sama.",
        variant: "destructive",
      });
      return;
    }

    setPasswordSaving(true);
    try {
      await apiFetch("/api/users/change-password/me", {
        method: "POST",
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: "Password Berhasil Diubah",
        description: "Gunakan password baru saat masuk berikutnya.",
      });
    } catch (err: any) {
      toast({
        title: "Gagal Mengubah Password",
        description: err.message || "Password lama yang Anda masukkan salah.",
        variant: "destructive",
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  // Handle Save Institution Config
  const handleSaveInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    setInstSaving(true);
    try {
      saveInstitutionProfile(instForm);
      toast({
        title: "Data Instansi & Penandatangan Disimpan",
        description: "Perubahan otomatis sinkron ke seluruh dokumen cetak resmi.",
      });
    } catch (err: any) {
      toast({
        title: "Gagal Menyimpan",
        description: err.message || "Gagal menyimpan konfigurasi instansi.",
        variant: "destructive",
      });
    } finally {
      setInstSaving(false);
    }
  };

  // Reset Institution to Default
  const handleResetInstitution = () => {
    setInstForm(DEFAULT_INSTITUTION_PROFILE);
    saveInstitutionProfile(DEFAULT_INSTITUTION_PROFILE);
    toast({
      title: "Konfigurasi Direset",
      description: "Data instansi dikembalikan ke pengaturan standar PERUMDAM TAR.",
    });
  };

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "US";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Profil & Pengaturan Sistem
          </h1>
          <p className="text-muted-foreground text-sm">
            Kelola profil pengguna, keamanan kata sandi, serta data instansi & penandatangan dokumen cetak resmi.
          </p>
        </div>
      </motion.div>

      {/* Modern 2-Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 max-w-md h-10 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="profil" className="text-xs font-semibold gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
            <User className="w-4 h-4" />
            Profil & Keamanan
          </TabsTrigger>
          <TabsTrigger value="instansi" className="text-xs font-semibold gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
            <Building2 className="w-4 h-4" />
            Instansi & Penandatangan
          </TabsTrigger>
        </TabsList>

        {/* ════════════════ TAB 1: PROFIL & KEAMANAN ════════════════ */}
        <TabsContent value="profil" className="space-y-6 m-0 animate-in fade-in duration-200">
          {/* Identity Overview Card */}
          <Card className="border border-border/80 shadow-xs bg-white dark:bg-card overflow-hidden">
            <div className="p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <Avatar className="w-16 h-16 border-2 border-primary/20 shadow-xs shrink-0">
                <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-foreground truncate">
                    {user?.fullName}
                  </h2>
                  <Badge variant="outline" className="text-xs font-semibold bg-primary/5 text-primary border-primary/20">
                    <UserCheck className="w-3 h-3 mr-1" />
                    {roleLabel(user?.role || "")}
                  </Badge>
                  {user?.branchName && (
                    <Badge variant="outline" className="text-xs text-sky-700 bg-sky-50 border-sky-200 font-medium">
                      <Building2 className="w-3 h-3 mr-1" />
                      {user.branchName}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Username: <strong className="text-foreground">@{user?.username}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Status Akun: <span className="text-emerald-600 font-semibold">Aktif & Terverifikasi</span> • Sesi Login Aman
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form Update Profil */}
            <Card className="border border-border/80 shadow-xs bg-white dark:bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-600" />
                  Informasi Akun
                </CardTitle>
                <CardDescription className="text-xs">
                  Perbarui nama lengkap dan email resmi Anda yang terdaftar pada sistem.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveProfile}>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Username</Label>
                    <Input
                      disabled
                      value={`@${user?.username || ""}`}
                      className="bg-muted/50 text-muted-foreground font-mono text-xs h-9"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Username bersifat permanen dan tidak dapat diubah sendiri.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nama Lengkap *</Label>
                    <Input
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      placeholder="Masukkan nama lengkap Anda"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Alamat Email</Label>
                    <Input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="email@pdamlomboktengah.co.id"
                      className="h-9 text-xs"
                    />
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-border/60 flex justify-end">
                  <Button type="submit" size="sm" disabled={profileSaving} className="gap-2 text-xs">
                    <Save className="w-3.5 h-3.5" />
                    {profileSaving ? "Menyimpan..." : "Simpan Profil"}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Form Ganti Password */}
            <Card className="border border-border/80 shadow-xs bg-white dark:bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  Keamanan Kata Sandi
                </CardTitle>
                <CardDescription className="text-xs">
                  Ganti kata sandi secara berkala untuk menjaga keamanan data logistik dan audit.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleChangePassword}>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Kata Sandi Saat Ini *</Label>
                    <Input
                      type="password"
                      value={passwordForm.oldPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                      placeholder="Masukkan kata sandi lama"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Kata Sandi Baru *</Label>
                    <Input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Minimal 6 karakter"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Konfirmasi Kata Sandi Baru *</Label>
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Ulangi kata sandi baru"
                      className="h-9 text-xs"
                    />
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-border/60 flex justify-end">
                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    disabled={passwordSaving || !passwordForm.oldPassword || !passwordForm.newPassword}
                    className="gap-2 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {passwordSaving ? "Memproses..." : "Perbarui Kata Sandi"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════ TAB 2: INSTANSI & PENANDATANGAN ════════════════ */}
        <TabsContent value="instansi" className="space-y-6 m-0 animate-in fade-in duration-200">
          <form onSubmit={handleSaveInstitution} className="space-y-6">
            {/* Kop Dokumen Live Preview Banner */}
            <Card className="border border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 shadow-xs overflow-hidden">
              <CardHeader className="pb-3 border-b border-sky-100 dark:border-sky-900/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-sky-600" />
                    <CardTitle className="text-sm font-bold text-sky-950 dark:text-sky-200">
                      Kop Surat & Identitas Dokumen Resmi
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-white border-sky-300 text-sky-700">
                    Live Cetak Dokumen
                  </Badge>
                </div>
                <CardDescription className="text-xs text-sky-800/80 dark:text-sky-300/80">
                  Format ini otomatis digunakan pada Surat Jalan (BPB), Bukti Barang Masuk (GRN), dan Laporan Audit SPI.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 bg-white dark:bg-card">
                <div className="flex items-center gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/40">
                  <div className="w-14 h-14 rounded-xl bg-white p-1 border shadow-xs flex items-center justify-center shrink-0">
                    <img src="/logo-perumdam.png" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <h3 className="font-extrabold text-base tracking-wide text-zinc-900 dark:text-zinc-100 uppercase">
                      {instForm.companyName || "PERUMDAM TIRTA ARDHIA RINJANI"}
                    </h3>
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wider uppercase">
                      {instForm.subTitle || "KABUPATEN LOMBOK TENGAH"}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {instForm.address} • {instForm.city} • Telp: {instForm.phone}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Identitas Instansi Fields */}
            <Card className="border border-border/80 shadow-xs bg-white dark:bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Data Perusahaan / Instansi
                </CardTitle>
                <CardDescription className="text-xs">
                  Informasi alamat dan kontak resmi yang tercetak pada kop laporan logistik.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nama Resmi Instansi *</Label>
                    <Input
                      value={instForm.companyName}
                      onChange={(e) => setInstForm({ ...instForm, companyName: e.target.value })}
                      placeholder="PERUMDAM TIRTA ARDHIA RINJANI"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Wilayah / Daerah *</Label>
                    <Input
                      value={instForm.subTitle}
                      onChange={(e) => setInstForm({ ...instForm, subTitle: e.target.value })}
                      placeholder="KABUPATEN LOMBOK TENGAH"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Alamat Kantor</Label>
                    <Input
                      value={instForm.address}
                      onChange={(e) => setInstForm({ ...instForm, address: e.target.value })}
                      placeholder="Jl. Basuki Rahmat No. 10, Praya"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Kota & Provinsi</Label>
                    <Input
                      value={instForm.city}
                      onChange={(e) => setInstForm({ ...instForm, city: e.target.value })}
                      placeholder="Kabupaten Lombok Tengah, NTB"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Telepon / Fax</Label>
                    <Input
                      value={instForm.phone}
                      onChange={(e) => setInstForm({ ...instForm, phone: e.target.value })}
                      placeholder="(0370) 654123"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Email Resmi</Label>
                    <Input
                      value={instForm.email}
                      onChange={(e) => setInstForm({ ...instForm, email: e.target.value })}
                      placeholder="logistik@perumdamtar.co.id"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Website</Label>
                    <Input
                      value={instForm.website}
                      onChange={(e) => setInstForm({ ...instForm, website: e.target.value })}
                      placeholder="www.perumdamtar.co.id"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pejabat Penandatangan Dokumen */}
            <Card className="border border-border/80 shadow-xs bg-white dark:bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Pejabat Penandatangan Dokumen Cetak
                </CardTitle>
                <CardDescription className="text-xs">
                  Nama dan NIP pejabat yang otomatis muncul pada kolom tanda tangan dokumen resmi (Mengetahui, Menyetujui, dan Auditor).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-xs">
                {/* 1. Direktur Utama */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                      1. Pimpinan Instansi / Direktur
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-medium">Tanda tangan persetujuan / mengetahui</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Nama Lengkap & Gelar</Label>
                      <Input
                        value={instForm.directorName}
                        onChange={(e) => setInstForm({ ...instForm, directorName: e.target.value })}
                        placeholder="Nama Direktur"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">NIP / NIK Pejabat</Label>
                      <Input
                        value={instForm.directorNip}
                        onChange={(e) => setInstForm({ ...instForm, directorNip: e.target.value })}
                        placeholder="19780512..."
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Jabatan Resmi</Label>
                      <Input
                        value={instForm.directorTitle}
                        onChange={(e) => setInstForm({ ...instForm, directorTitle: e.target.value })}
                        placeholder="Direktur Utama"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Kepala Bagian Logistik & Gudang */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      2. Kepala Bagian Logistik & Gudang
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-medium">Penanggung jawab pengeluaran material & surat jalan</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Nama Lengkap & Gelar</Label>
                      <Input
                        value={instForm.warehouseHeadName}
                        onChange={(e) => setInstForm({ ...instForm, warehouseHeadName: e.target.value })}
                        placeholder="Nama Kepala Bagian"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">NIP / NIK Pejabat</Label>
                      <Input
                        value={instForm.warehouseHeadNip}
                        onChange={(e) => setInstForm({ ...instForm, warehouseHeadNip: e.target.value })}
                        placeholder="19840215..."
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Jabatan Resmi</Label>
                      <Input
                        value={instForm.warehouseHeadTitle}
                        onChange={(e) => setInstForm({ ...instForm, warehouseHeadTitle: e.target.value })}
                        placeholder="Kepala Bagian Logistik & Gudang"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Kepala SPI / Auditor Utama */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                      3. Kepala Satuan Pengawas Intern (SPI)
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-medium">Penandatangan Laporan Hasil Audit & Verifikasi Lapangan</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Nama Lengkap & Gelar</Label>
                      <Input
                        value={instForm.spiHeadName}
                        onChange={(e) => setInstForm({ ...instForm, spiHeadName: e.target.value })}
                        placeholder="Nama Kepala SPI"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">NIP / NIK Pejabat</Label>
                      <Input
                        value={instForm.spiHeadNip}
                        onChange={(e) => setInstForm({ ...instForm, spiHeadNip: e.target.value })}
                        placeholder="19810920..."
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Jabatan Resmi</Label>
                      <Input
                        value={instForm.spiHeadTitle}
                        onChange={(e) => setInstForm({ ...instForm, spiHeadTitle: e.target.value })}
                        placeholder="Kepala Satuan Pengawas Intern (SPI)"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t border-border/60 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetInstitution}
                  className="gap-2 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset ke Default
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={instSaving}
                  className="gap-2 text-xs bg-primary text-primary-foreground"
                >
                  <Save className="w-3.5 h-3.5" />
                  {instSaving ? "Menyimpan..." : "Simpan Data Instansi & Pejabat"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
