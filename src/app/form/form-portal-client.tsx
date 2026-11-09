"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Users, UserCircle, Search, MapPin, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ROOMS } from "@/lib/constants"

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
  const [step, setStep] = useState(1)
  const [level, setLevel] = useState<"SD" | "SMP">("SD")
  const [room, setRoom] = useState<string | null>(null)
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

  // Untuk SMP: daftar ruangan yang masih memiliki calon siswa aktif
  const availableRooms = useMemo(() => {
    if (level !== "SMP") return []
    const activeRooms = new Set(
      candidates
        .filter(c => !isCandidateFullySubmitted(c))
        .filter(c => c.level === "SMP" && c.room)
        .map(c => c.room)
    )
    return ROOMS.filter(r => activeRooms.has(r))
  }, [candidates, level])

  // Calon siswa yang disaring:
  // - SD: langsung seluruh siswa SD (tanpa filter ruangan) + filter pencarian teks
  // - SMP: tetap seperti alur lama (harus filter ruangan)
  const filteredCandidates = useMemo(() => {
    if (level === "SD") {
      const query = searchQuery.trim().toLowerCase()
      return candidates
        .filter(c => !isCandidateFullySubmitted(c))
        .filter(c => c.level === "SD")
        .filter(c => !query || c.name.toLowerCase().includes(query))
    } else {
      return candidates
        .filter(c => !isCandidateFullySubmitted(c))
        .filter(c => c.level === "SMP" && c.room === room)
    }
  }, [candidates, level, room, searchQuery])

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

      {/* Step Indicators untuk alur SMP */}
      {level === "SMP" && (
        <div className="flex justify-between items-center px-4 mb-4 relative">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-100 -z-10" />
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div className={cn(
                "w-9 h-9 rounded-2xl flex items-center justify-center text-[12px] font-black transition-all shadow-md",
                step === s ? "bg-slate-900 text-white scale-110" : 
                step > s ? "bg-emerald-500 text-white" : "bg-white text-slate-300 border border-slate-100"
              )}>
                {step > s ? "✓" : s}
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest",
                step === s ? "text-slate-900" : "text-slate-300"
              )}>
                {s === 1 ? "Ruangan" : s === 2 ? "Nama" : "Mulai"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-[36px] p-6 sm:p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        
        {/* ========================================================= */}
        {/* KONDISI A: ALUR UNIT SD (BARU - TANPA PILIH RUANGAN)      */}
        {/* ========================================================= */}
        {level === "SD" && (
          <>
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
                      onClick={() => { setLevel("SD"); setStep(1); setSelectedId(null); }}
                      className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 transition-all bg-orange-50 border-orange-500 shadow-md shadow-orange-500/10"
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center p-1.5 transition-all bg-white shadow-sm">
                        <img src="/logo-sd.png" alt="SD Logo" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-orange-700">
                        UNIT SD
                      </span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => { setLevel("SMP"); setStep(1); setSelectedId(null); setRoom(null); }}
                      className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 transition-all bg-white border-slate-100 hover:border-emerald-200 opacity-70 hover:opacity-100"
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center p-1.5 transition-all bg-slate-50">
                        <img src="/logo-smp.png" alt="SMP Logo" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                        UNIT SMP
                      </span>
                    </button>
                  </div>
                </div>

                {/* Pencarian Nama Anak SD */}
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    <Search className="h-3 w-3 text-emerald-600" /> 2. Cari Nama Calon Siswa SD
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

                {/* Daftar Nama Siswa SD */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {filteredCandidates.length} nama siswa SD tersedia
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
                            : "Seluruh calon siswa SD sudah selesai mengisi formulir."}
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
                              Calon Siswa Unit SD &bull; Klik untuk mengisi observasi
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

            {step === 2 && selectedCandidate && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
                <div className="space-y-2 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <span className="inline-block rounded-full bg-orange-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-orange-800">
                    Calon Siswa Unit SD
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {selectedCandidate.name}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Observasi Calon Siswa Baru &bull; TA 2027/2028
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs font-medium text-emerald-800">
                  ✓ Formulir observasi ini diisi oleh <strong>Orang Tua / Wali</strong> calon siswa.
                </div>

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
                    className="h-13 rounded-2xl text-white font-black italic shadow-lg flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                    onClick={handleStart}
                  >
                    MULAI MENGISI <ArrowRight size={18} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* KONDISI B: ALUR UNIT SMP (TETAP SEPERTI YANG LAMA)        */}
        {/* ========================================================= */}
        {level === "SMP" && (
          <>
            {/* Step 1 SMP: Pilih Ruangan Observasi */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                      <Users className="h-3 w-3 text-blue-500" /> Pilih Unit Sekolah
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => { setLevel("SD"); setStep(1); setSelectedId(null); }}
                        className="flex flex-col items-center justify-center gap-3 p-4 rounded-[22px] border-2 transition-all bg-white border-slate-100 hover:border-orange-200 opacity-70 hover:opacity-100"
                      >
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center p-2 transition-all bg-slate-50">
                          <img src="/logo-sd.png" alt="SD Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">UNIT SD</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => { setLevel("SMP"); setStep(1); }}
                        className="flex flex-col items-center justify-center gap-3 p-4 rounded-[22px] border-2 transition-all bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-500/20"
                      >
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center p-2 transition-all bg-white shadow-sm">
                          <img src="/logo-smp.png" alt="SMP Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700">UNIT SMP</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                      <MapPin className="h-3 w-3 text-emerald-500" /> Pilih Ruangan Observasi SMP
                    </label>
                    <div className="relative group">
                      <select
                        value={room || ""}
                        onChange={(e) => setRoom(e.target.value)}
                        className={cn(
                          "w-full h-16 border-2 rounded-[22px] px-6 text-[15px] font-black italic appearance-none outline-none transition-all cursor-pointer",
                          room ? "bg-emerald-50 border-emerald-200 text-emerald-900 focus:border-emerald-500" :
                          "bg-slate-50 border-slate-100 text-slate-400 focus:border-slate-900"
                        )}
                      >
                        <option value="" disabled>Klik untuk memilih ruangan...</option>
                        {availableRooms.map((r) => (
                          <option key={r} value={r}>RUANGAN {r}</option>
                        ))}
                      </select>
                      <div className={cn(
                        "absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none transition-colors",
                        room ? "text-slate-900" : "text-slate-300"
                      )}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  className={cn(
                    "w-full h-16 rounded-[24px] font-black italic shadow-2xl transition-all hover:-translate-y-1 active:scale-95 text-white",
                    !room ? "bg-slate-200" : "bg-slate-900 shadow-slate-900/30"
                  )}
                  disabled={!room}
                  onClick={() => setStep(2)}
                >
                  CARI NAMA SISWA <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Step 2 SMP: Pilih Nama Siswa */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    <UserCircle className="h-3 w-3" /> Pilih Nama Siswa di Ruangan {room}
                  </label>
                  <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {filteredCandidates.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 font-medium">
                        Tidak ada siswa terdaftar di SMP {room}
                      </div>
                    ) : (
                      filteredCandidates.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedId(c.id)}
                          className={cn(
                            "w-full p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group",
                            selectedId === c.id 
                              ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10"
                              : "border-slate-100 bg-white hover:border-slate-200"
                          )}
                        >
                          {selectedId === c.id && (
                            <div className="absolute top-0 right-0 p-2 text-emerald-600">
                              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
                                <div className="w-2 h-2 rounded-full bg-current" />
                              </div>
                            </div>
                          )}
                          <div className={cn("font-black italic uppercase transition-colors", selectedId === c.id ? "text-emerald-700" : "text-slate-900")}>
                            {c.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">SMP • {room}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-14 rounded-2xl border-slate-200 font-bold" onClick={() => setStep(1)}>
                    Kembali
                  </Button>
                  <Button 
                    style={{ flex: 2 }}
                    className={cn(
                      "h-14 rounded-2xl text-white font-black italic shadow-xl transition-all flex items-center justify-center",
                      !selectedId ? "bg-slate-200" : "bg-emerald-600 shadow-emerald-600/30"
                    )}
                    disabled={!selectedId}
                    onClick={() => setStep(3)}
                  >
                    PILIH NAMA <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3 SMP: Pilih Peran Pengisi (Orang Tua / Calon Siswa Sendiri) */}
            {step === 3 && selectedCandidate && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 text-center">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa Terpilih</p>
                  <h3 className="text-2xl font-black italic uppercase text-emerald-700">
                    {selectedCandidate.name}
                  </h3>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Siapa yang mengisi?</label>
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      type="button"
                      onClick={() => !parentSubmitted && setRole("parent")}
                      disabled={parentSubmitted}
                      className={cn(
                        "p-6 rounded-[28px] border-2 text-center transition-all flex flex-col items-center gap-2 group relative overflow-hidden",
                        parentSubmitted 
                          ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed" 
                          : role === "parent" 
                            ? "border-emerald-500 bg-emerald-500 text-white shadow-2xl shadow-emerald-500/30 -translate-y-1" 
                            : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors", parentSubmitted ? "bg-slate-200 text-slate-400" : role === "parent" ? "bg-white/20" : "bg-emerald-50 text-emerald-500")}>
                        <Users className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col">
                        <span className={cn("font-black italic uppercase tracking-tight", parentSubmitted ? "text-slate-400" : "")}>Orang Tua Calon Siswa</span>
                        {parentSubmitted && <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mt-1">✓ Sudah Mengisi</span>}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => !studentSubmitted && setRole("student")}
                      disabled={studentSubmitted}
                      className={cn(
                        "p-6 rounded-[28px] border-2 text-center transition-all flex flex-col items-center gap-2 group relative overflow-hidden",
                        studentSubmitted 
                          ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed" 
                          : role === "student" 
                            ? "border-blue-500 bg-blue-500 text-white shadow-2xl shadow-blue-500/30 -translate-y-1" 
                            : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-colors overflow-hidden p-2", studentSubmitted ? "bg-slate-200" : role === "student" ? "bg-white/20" : "bg-white border border-slate-100 shadow-sm")}>
                        <img 
                          src="/logo-smp.png"
                          alt="Logo Unit"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className={cn("font-black italic uppercase tracking-tight", studentSubmitted ? "text-slate-400" : "")}>Calon Siswa Sendiri</span>
                        {studentSubmitted && <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 mt-1">✓ Sudah Mengisi</span>}
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-14 rounded-2xl border-slate-200 font-bold" onClick={() => setStep(2)}>
                    Ganti Nama
                  </Button>
                  <Button 
                    style={{ flex: 2 }}
                    className={cn(
                      "h-14 rounded-2xl text-white font-black italic shadow-xl flex items-center justify-center",
                      (role === "parent" && parentSubmitted) || (role === "student" && studentSubmitted)
                        ? "bg-slate-200 cursor-not-allowed"
                        : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                    )}
                    disabled={(role === "parent" && parentSubmitted) || (role === "student" && studentSubmitted)}
                    onClick={handleStart}
                  >
                    MULAI OBSERVASI <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* Footer Branding */}
      <div className="mt-8 text-center space-y-1.5 pb-10">
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em]">Al Fakhir Modern Islamic School</p>
      </div>
    </div>
  )
}
