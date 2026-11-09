"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Users, UserCircle, Search, CheckCircle, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Candidate {
  id: string
  name: string
  level: string
  room: string | null
  status?: string
  formAnswers?: {
    question: {
      category: string
    }
  }[]
}

interface Props {
  candidates: Candidate[]
}

export default function FormPortalClient({ candidates }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [level, setLevel] = useState<"SD" | "SMP">("SD")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [role, setRole] = useState<"parent" | "student">("parent")

  useEffect(() => {
    setMounted(true)
  }, [])

  const selectedCandidate = useMemo(() => {
    return candidates.find(c => c.id === selectedId)
  }, [candidates, selectedId])

  const parentSubmitted = useMemo(() => {
    return selectedCandidate?.formAnswers?.some(a => a.question.category === "ORANG TUA")
  }, [selectedCandidate])

  const studentSubmitted = useMemo(() => {
    return selectedCandidate?.formAnswers?.some(a => a.question.category === "SISWA")
  }, [selectedCandidate])

  const isCandidateFullySubmitted = (c: Candidate) => {
    const parentDone = c.formAnswers?.some(a => a.question.category === "ORANG TUA")
    const studentDone = c.formAnswers?.some(a => a.question.category === "SISWA")
    if (c.level === "SD") {
      return Boolean(parentDone || c.status === "RESPONSE_RECEIVED" || c.status === "REVIEWED" || c.status === "COMPLETED")
    } else {
      return Boolean((parentDone && studentDone) || c.status === "REVIEWED" || c.status === "COMPLETED")
    }
  }

  const filteredCandidates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return candidates
      .filter(c => !isCandidateFullySubmitted(c))
      .filter(c => c.level === level)
      .filter(c => !query || c.name.toLowerCase().includes(query))
  }, [candidates, level, searchQuery])

  if (!mounted) return null

  const handleStart = () => {
    if (selectedId) {
      router.push(`/form/${selectedId}${role === "student" ? "?role=student" : ""}`)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-3 mb-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-1">
            Observasi
          </h1>
          <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Al Fakhir Modern Islamic School</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[36px] p-6 sm:p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        {/* Step 1: Pilih Unit & Cari Nama Anak Langsung */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Pilihan Unit */}
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                <Users className="h-3 w-3 text-emerald-600" /> 1. Pilih Unit Sekolah
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setLevel("SD"); setSelectedId(null); }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 transition-all",
                    level === "SD" 
                      ? "bg-orange-50 border-orange-500 shadow-md shadow-orange-500/10" 
                      : "bg-white border-slate-100 hover:border-orange-200 opacity-70 hover:opacity-100"
                  )}
                >
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center p-1.5 transition-all", level === "SD" ? "bg-white shadow-sm" : "bg-slate-50")}>
                    <img src="/logo-sd.png" alt="SD Logo" className="w-full h-full object-contain" />
                  </div>
                  <span className={cn("text-[11px] font-black uppercase tracking-widest", level === "SD" ? "text-orange-700" : "text-slate-500")}>
                    UNIT SD
                  </span>
                </button>
                
                <button
                  type="button"
                  onClick={() => { setLevel("SMP"); setSelectedId(null); }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 transition-all",
                    level === "SMP" 
                      ? "bg-emerald-50 border-emerald-500 shadow-md shadow-emerald-500/10" 
                      : "bg-white border-slate-100 hover:border-emerald-200 opacity-70 hover:opacity-100"
                  )}
                >
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center p-1.5 transition-all", level === "SMP" ? "bg-white shadow-sm" : "bg-slate-50")}>
                    <img src="/logo-smp.png" alt="SMP Logo" className="w-full h-full object-contain" />
                  </div>
                  <span className={cn("text-[11px] font-black uppercase tracking-widest", level === "SMP" ? "text-emerald-700" : "text-slate-500")}>
                    UNIT SMP
                  </span>
                </button>
              </div>
            </div>

            {/* Input Pencarian Nama Siswa */}
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                <Search className="h-3 w-3 text-emerald-600" /> 2. Cari Nama Calon Siswa
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Ketik nama ananda di sini..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 pl-11 pr-4 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Daftar Hasil Siswa */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold text-slate-500">
                  {filteredCandidates.length} nama tersedia di {level === "SD" ? "Unit SD" : "Unit SMP"}
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-[11px] text-emerald-600 hover:underline font-medium"
                  >
                    Reset pencarian
                  </button>
                )}
              </div>

              <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                {filteredCandidates.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm font-semibold text-slate-600">Nama tidak ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery
                        ? `Tidak ada calon siswa dengan kata kunci "${searchQuery}".`
                        : `Seluruh calon siswa di ${level} sudah selesai mengisi formulir.`}
                    </p>
                  </div>
                ) : (
                  filteredCandidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(c.id);
                        setRole("parent");
                        setStep(2);
                      }}
                      className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all group flex items-center justify-between gap-3 shadow-sm hover:shadow-md"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors truncate">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {c.level} &bull; Klik untuk mengisi observasi
                        </div>
                      </div>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <ChevronRight size={16} />
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Konfirmasi Nama & Mulai Observasi */}
        {step === 2 && selectedCandidate && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
            <div className="space-y-2 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-800">
                Calon Siswa Terpilih
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {selectedCandidate.name}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Unit {selectedCandidate.level} &bull; Observasi Tahun Ajaran Baru
              </p>
            </div>

            {/* Pilihan Pengisi untuk SMP */}
            {selectedCandidate.level === "SMP" ? (
              <div className="space-y-3 text-left">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Siapa yang mengisi sekarang?
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    onClick={() => !parentSubmitted && setRole("parent")}
                    disabled={parentSubmitted}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3.5",
                      parentSubmitted 
                        ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed" 
                        : role === "parent" 
                          ? "border-emerald-500 bg-emerald-50/60 shadow-sm" 
                          : "border-slate-100 bg-white hover:border-slate-200"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", role === "parent" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500")}>
                      <Users size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900">Orang Tua Calon Siswa</div>
                      <div className="text-xs text-slate-500">Mengisi kuesioner observasi orang tua</div>
                    </div>
                    {parentSubmitted && (
                      <span className="text-xs font-bold text-emerald-600">Sudah Mengisi</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => !studentSubmitted && setRole("student")}
                    disabled={studentSubmitted}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3.5",
                      studentSubmitted 
                        ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed" 
                        : role === "student" 
                          ? "border-blue-500 bg-blue-50/60 shadow-sm" 
                          : "border-slate-100 bg-white hover:border-slate-200"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", role === "student" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}>
                      <UserCircle size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900">Calon Siswa Sendiri</div>
                      <div className="text-xs text-slate-500">Mengisi kuesioner wawancara siswa</div>
                    </div>
                    {studentSubmitted && (
                      <span className="text-xs font-bold text-blue-600">Sudah Mengisi</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs font-medium text-emerald-800">
                ✓ Formulir observasi ini diisi oleh <strong>Orang Tua / Wali</strong> calon siswa.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-13 rounded-2xl border-slate-200 font-bold text-slate-700"
                onClick={() => setStep(1)}
              >
                Ganti Siswa
              </Button>
              <Button 
                style={{ flex: 2 }}
                className={cn(
                  "h-13 rounded-2xl text-white font-black italic shadow-lg flex items-center justify-center gap-2",
                  (role === "parent" && parentSubmitted) || (role === "student" && studentSubmitted)
                    ? "bg-slate-200 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                )}
                disabled={(role === "parent" && parentSubmitted) || (role === "student" && studentSubmitted)}
                onClick={handleStart}
              >
                MULAI MENGISI <ArrowRight size={18} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="mt-8 text-center space-y-1.5 pb-10">
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em]">Al Fakhir Modern Islamic School</p>
      </div>
    </div>
  )
}
