"use client"

import { signIn } from "next-auth/react"
import { GraduationCap, AlertCircle, Shield, BookOpen } from "lucide-react"
import { SCHOOL_NAME } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface LoginClientProps {
  error?: string
  users: { username: string; label: string }[]
}

export default function LoginClient({ error: initialError, users }: LoginClientProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(undefined)
    const res = await signIn("credentials", { username, password, redirect: false })
    if (res?.error) {
      setError(res.code === "too_many_attempts" ? "too_many_attempts" : "CredentialsSignin")
      setPassword("")
      setLoading(false)
      return
    }
    // Full reload agar session & redirect berdasarkan role diproses server.
    window.location.href = "/"
  }

  const errorMessage: Record<string, string> = {
    unauthorized: "Akun Anda tidak memiliki akses. Hubungi administrator.",
    CredentialsSignin: "Password salah. Silakan coba lagi.",
    too_many_attempts: "Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.",
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
              Pilih username Anda, lalu masukkan password untuk mengakses dashboard.
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-400 mb-2">
                Username
              </label>
              <select
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="" disabled>
                  Pilih username
                </option>
                {users.map((u) => (
                  <option key={u.username} value={u.username}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!username}
                placeholder={username ? "Masukkan password" : "Pilih username terlebih dahulu"}
                className="w-full px-4 py-3.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Memeriksa..." : "Masuk"}
            </button>
          </form>

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
