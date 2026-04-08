import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Package, AlertCircle, Eye, EyeOff, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      setLocation("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg-mesh flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-500/[0.07] rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-500/[0.06] rounded-full blur-3xl animate-float delay-300" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-blue-500/[0.05] rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Radial highlight at center */}
        <div className="absolute inset-0 bg-gradient-radial from-cyan-500/[0.03] via-transparent to-transparent" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/25 flex items-center justify-center mx-auto backdrop-blur-xl shadow-xl shadow-black/30 animate-pulse-glow">
              <Package className="w-9 h-9 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gradient-primary mb-1">SI GAPLEK</h1>
          <p className="text-sm text-muted-foreground/70 font-medium">
            Sistem Gudang & Pengelolaan Logistik
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-2xl p-7 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground/90">Selamat Datang</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Masukkan kredensial akun Anda untuk melanjutkan</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive animate-fade-in-up">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-foreground/70 text-sm font-semibold">
                Username
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  autoComplete="username"
                  disabled={loading}
                  required
                  className={cn(
                    "h-11 rounded-xl bg-white/[0.04] border-white/[0.1] text-foreground/90 placeholder:text-muted-foreground/40",
                    "focus:border-primary/40 focus:ring-primary/20 focus:ring-2 transition-all duration-200",
                    "hover:border-white/[0.15] hover:bg-white/[0.06]"
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-foreground/70 text-sm font-semibold">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                  className={cn(
                    "h-11 rounded-xl bg-white/[0.04] border-white/[0.1] text-foreground/90 placeholder:text-muted-foreground/40 pr-11",
                    "focus:border-primary/40 focus:ring-primary/20 focus:ring-2 transition-all duration-200",
                    "hover:border-white/[0.15] hover:bg-white/[0.06]"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className={cn(
                "w-full h-11 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2",
                "bg-gradient-to-r from-primary to-cyan-400 text-primary-foreground",
                "hover:from-cyan-400 hover:to-primary hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none",
                "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-transparent"
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Memverifikasi..." : "Masuk ke Sistem"}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50 mb-2">
              Akun Demo
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { user: "admin", role: "Admin" },
                { user: "gudang1", role: "Gudang" },
                { user: "keuangan1", role: "Keuangan" },
                { user: "pimpinan1", role: "Pimpinan" },
              ].map((acc) => (
                <button
                  key={acc.user}
                  type="button"
                  onClick={() => { setUsername(acc.user); setPassword("password"); }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-primary/20 hover:bg-primary/[0.05] transition-all duration-150 text-left group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary shrink-0 transition-colors" />
                  <div>
                    <p className="text-xs font-semibold text-foreground/70 group-hover:text-primary/90 transition-colors">{acc.user}</p>
                    <p className="text-[9px] text-muted-foreground/40">{acc.role}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/30 mt-2 text-center">Password: <span className="font-mono">password</span></p>
          </div>
        </div>

        <p className="text-center text-muted-foreground/30 text-xs mt-6">
          © {new Date().getFullYear()} Tirta Ardhia Rinjani · SI GAPLEK v2.0
        </p>
      </div>
    </div>
  );
}
