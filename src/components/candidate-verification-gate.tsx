"use client"

import { useState } from "react"
import { ShieldCheck, ArrowRight, Lock, Loader2, Phone } from "lucide-react"
import { useRouter } from "next/navigation"
import { verifyCandidateAccess } from "@/lib/candidate-actions"

interface CandidateVerificationGateProps {
  candidateId: string
  candidateName: string
  targetType: "form" | "academic"
  role?: string
}

export function CandidateVerificationGate({
  candidateId,
  candidateName,
  targetType,
  role = "parent",
}: CandidateVerificationGateProps) {
  const router = useRouter()
  const [phoneInput, setPhoneInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneInput.trim()) {
      setError("Masukkan nomor HP atau 4 digit terakhir.")
      return
    }

    setLoading(false)
    setError(null)
    setLoading(true)

    try {
      const res = await verifyCandidateAccess(candidateId, phoneInput)
      if (!res.ok) {
        setError(res.error || "Verifikasi gagal. Pastikan nomor sesuai dengan pendaftaran.")
        setLoading(false)
        return
      }

      // Success: redirect to current URL with token parameter
      const base = targetType === "form" ? `/form/${candidateId}` : `/academic/${candidateId}`
      const params = new URLSearchParams()
      if (role && targetType === "form") params.set("role", role)
      if (res.token) params.set("token", res.token)

      router.push(`${base}?${params.toString()}`)
      router.refresh()
    } catch {
      setError("Terjadi kesalahan koneksi. Silakan coba lagi.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xl shadow-slate-100/50 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100">
            <Lock size={26} />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
              Verifikasi Akses {targetType === "form" ? "Formulir" : "Tes Akademik"}
            </span>
            <h1 className="text-xl font-bold text-slate-900">{candidateName}</h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Untuk melindungi kerahasiaan data ananda, masukkan nomor WhatsApp/HP orang tua (atau 4 digit terakhir) yang terdaftar.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="phone-input" className="text-xs font-semibold text-slate-700">
              Nomor WhatsApp / HP Orang Tua
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                id="phone-input"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="0812xxxx atau 4 digit terakhir"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value)
                  if (error) setError(null)
                }}
                disabled={loading}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </div>
            {error && (
              <p className="text-xs font-medium text-rose-600 pt-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Memverifikasi...
              </>
            ) : (
              <>
                Buka {targetType === "form" ? "Formulir" : "Ujian"}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-slate-100 pt-4 text-center">
          <p className="text-[11px] text-slate-400">
            Perguruan Islam Al Fakhir · Jika ada kendala, hubungi pewawancara di ruangan Anda.
          </p>
        </div>
      </div>
    </div>
  )
}
