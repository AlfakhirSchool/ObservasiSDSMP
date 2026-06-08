"use client"

import { signIn } from "next-auth/react"
import { GraduationCap, AlertCircle, Shield, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SCHOOL_NAME } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface LoginClientProps {
  error?: string
}

export default function LoginClient({ error }: LoginClientProps) {
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    await signIn("google", { callbackUrl: "/interviewer" })
  }

  const errorMessage: Record<string, string> = {
    unauthorized:
      "Email Anda tidak terdaftar dalam sistem. Hubungi administrator.",
    OAuthCallbackError: "Gagal masuk dengan Google. Silakan coba lagi.",
    default: "Terjadi kesalahan. Silakan coba lagi.",
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-linear-to-br from-[#0D5C63] via-[#0F172A] to-sd relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-smp to-sd flex items-center justify-center shadow-2xl shadow-smp/20 mb-6 group-hover:scale-110 transition-transform duration-500">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">
                Al Fakhir
              </h1>
              <p className="text-emerald-400 text-xs font-medium">
                Observation System
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <div className="text-4xl font-bold text-white leading-tight mb-4">
              Sistem Observasi
              <br />
              <h1 className="text-3xl font-black tracking-tighter bg-linear-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent italic">
                Penerimaan Siswa
              </h1>
            </div>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Platform digital untuk proses wawancara dan observasi penerimaan
              siswa baru berbasis AI.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-md">
            {[
              { 
                icon: Shield, 
                title: "Akses Aman & Terpadu", 
                desc: "Manajemen berbasis peran untuk Admin dan Pewawancara.",
                color: "from-blue-500/20 to-blue-600/5",
                iconColor: "text-blue-400"
              },
              { 
                icon: BookOpen, 
                title: "Sinkronisasi Real-Time", 
                desc: "Terintegrasi penuh dengan Google Forms & Sheets API.",
                color: "from-emerald-500/20 to-emerald-600/5",
                iconColor: "text-emerald-400"
              },
              { 
                icon: GraduationCap, 
                title: "AI Candidate Insights", 
                desc: "Ringkasan profil siswa otomatis menggunakan Gemini AI.",
                color: "from-gold/20 to-yellow-600/5",
                iconColor: "text-gold"
              },
            ].map(({ icon: Icon, title, desc, color, iconColor }) => (
              <div key={title} className={cn(
                "group relative p-5 rounded-[24px] bg-linear-to-br border border-white/10 hover:border-white/20 transition-all duration-500",
                color
              )}>
                <div className="flex gap-4 items-start relative z-10">
                  <div className={cn("w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500", iconColor)}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-black text-white uppercase tracking-tight italic mb-1">{title}</h3>
                    <p className="text-slate-400 text-[12px] leading-relaxed font-medium">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-slate-600 text-xs">{SCHOOL_NAME}</p>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="absolute inset-0 bg-linear-to-br from-emerald-500/10 via-transparent to-blue-500/10 pointer-events-none" />
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-smp to-sd flex items-center justify-center">
              <GraduationCap className="h-5.5 w-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base">Al Fakhir</h1>
              <p className="text-gold text-xs">Observation System</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              Selamat Datang
            </h2>
            <p className="text-slate-400 text-sm">
              Masuk dengan akun Google Anda untuk mengakses dashboard.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-300">
                {errorMessage[error] || errorMessage.default}
              </p>
            </div>
          )}

          {/* Google Sign In */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            <span>
              {loading ? "Mengalihkan..." : "Masuk dengan Google"}
            </span>
          </button>

          <p className="mt-6 text-center text-xs text-slate-600">
            Hanya akun yang terdaftar yang dapat mengakses sistem ini.
            <br />
            Hubungi administrator jika Anda tidak bisa masuk.
          </p>
        </div>
      </div>
    </div>
  )
}
