"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, ArrowRight, MapPin, Users, UserCircle } from "lucide-react"
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
  const [level, setLevel] = useState<string | null>(null)
  const [room, setRoom] = useState<string | null>(null)
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
    return candidates
      .filter(c => !isCandidateFullySubmitted(c))
      .filter(c => c.level === level && c.room === room)
  }, [candidates, level, room])

  const availableRooms = useMemo(() => {
    if (!level) return []
    const activeRooms = new Set(
      candidates
        .filter(c => !isCandidateFullySubmitted(c))
        .filter(c => c.level === level && c.room)
        .map(c => c.room)
    )
    return ROOMS.filter(r => activeRooms.has(r))
  }, [candidates, level])

  if (!mounted) return null

  const handleStart = () => {
    if (selectedId) {
      router.push(`/form/${selectedId}${role === "student" ? "?role=student" : ""}`)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4 mb-10">

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

      {/* Step Indicators */}
      <div className="flex justify-between items-center px-4 mb-8 relative">
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-100 -z-10" />
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center text-[13px] font-black transition-all duration-500 shadow-lg",
              step === s ? "bg-slate-900 text-white scale-110 rotate-3" : 
              step > s ? "bg-emerald-500 text-white" : "bg-white text-slate-300 border border-slate-100"
            )}>
              {step > s ? "✓" : s}
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              step === s ? "text-slate-900" : "text-slate-300"
            )}>
              {s === 1 ? "Unit" : s === 2 ? "Nama" : "Mulai"}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[40px] p-8 shadow-2xl shadow-slate-200/50 border border-slate-50 relative overflow-hidden">
        {/* Step 1: Level & Room (Dropdown Version) */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  <Users className="h-3 w-3 text-blue-500" /> Pilih Unit Sekolah
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setLevel("SD")}
                    className={cn(
                      "flex flex-col items-center justify-center gap-3 p-4 rounded-[22px] border-2 transition-all group",
                      level === "SD" ? "bg-orange-50 border-orange-500 shadow-lg shadow-orange-500/20" : "bg-white border-slate-100 hover:border-orange-200"
                    )}
                  >
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center p-2 transition-all", level === "SD" ? "bg-white shadow-sm" : "bg-slate-50 group-hover:bg-orange-50")}>
                      <img src="/logo-sd.png" alt="SD Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className={cn("text-[11px] font-black uppercase tracking-widest", level === "SD" ? "text-orange-700" : "text-slate-400 group-hover:text-orange-500")}>UNIT SD</span>
                  </button>
                  
                  <button
                    onClick={() => setLevel("SMP")}
                    className={cn(
                      "flex flex-col items-center justify-center gap-3 p-4 rounded-[22px] border-2 transition-all group",
                      level === "SMP" ? "bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-white border-slate-100 hover:border-emerald-200"
                    )}
                  >
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center p-2 transition-all", level === "SMP" ? "bg-white shadow-sm" : "bg-slate-50 group-hover:bg-emerald-50")}>
                      <img src="/logo-smp.png" alt="SMP Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className={cn("text-[11px] font-black uppercase tracking-widest", level === "SMP" ? "text-emerald-700" : "text-slate-400 group-hover:text-emerald-500")}>UNIT SMP</span>
                  </button>
                </div>
              </div>

              {level && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    <MapPin className="h-3 w-3 text-emerald-500" /> Pilih Ruangan Observasi
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
              )}
            </div>

            <Button 
              className={cn(
                "w-full h-16 rounded-[24px] font-black italic shadow-2xl transition-all hover:-translate-y-1 active:scale-95 text-white",
                !level || !room ? "bg-slate-200" : "bg-slate-900 shadow-slate-900/30"
              )}
              disabled={!level || !room}
              onClick={() => setStep(2)}
            >
              CARI NAMA SISWA <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Step 2: Select Name */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                <UserCircle className="h-3 w-3" /> Pilih Nama Anda
              </label>
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {filteredCandidates.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-medium">
                    Tidak ada siswa terdaftar di {level} {room}
                  </div>
                ) : (
                  filteredCandidates.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        "w-full p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group",
                        selectedId === c.id 
                          ? (level === "SD" ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10" : "border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/10") 
                          : "border-slate-100 bg-white hover:border-slate-200"
                      )}
                    >
                      {selectedId === c.id && (
                        <div className={cn("absolute top-0 right-0 p-2", level === "SD" ? "text-blue-500" : "text-purple-500")}>
                          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-current" />
                          </div>
                        </div>
                      )}
                      <div className={cn("font-black italic uppercase transition-colors", selectedId === c.id ? (level === "SD" ? "text-blue-700" : "text-purple-700") : "text-slate-900")}>
                        {c.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{level} • {room}</div>
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
                  !selectedId ? "bg-slate-200" : (level === "SD" ? "bg-blue-600 shadow-blue-600/30" : "bg-purple-600 shadow-purple-600/30")
                )}
                disabled={!selectedId}
                onClick={() => setStep(3)}
              >
                PILIH NAMA <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Select Role */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 text-center">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa Terpilih</p>
              <h3 className={cn(
                "text-2xl font-black italic uppercase",
                level === "SD" ? "text-blue-600" : "text-purple-600"
              )}>
                {candidates.find(c => c.id === selectedId)?.name}
              </h3>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Siapa yang mengisi?</label>
              <div className="grid grid-cols-1 gap-4">
                <button
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
                {level === "SMP" && (
                  <button
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
                )}
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
      </div>

      {/* Footer Branding */}
      <div className="mt-8 text-center space-y-2 pb-10">
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.4em]">Al Fakhir Modern Islamic School</p>
        <p className="text-[10px] text-slate-400 font-medium">Developer by Feri</p>
      </div>
    </div>
  )
}
