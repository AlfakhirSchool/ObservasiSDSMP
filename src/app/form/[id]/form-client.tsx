"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { GraduationCap, Send, CheckCircle2, Loader2 } from "lucide-react"
import { cn, getAcademicYear } from "@/lib/utils"

import { INTERVIEWERS } from "@/lib/constants"

interface Question {
  id: string
  text: string
  type: "text" | "long_text" | "choice" | "rating"
  category: string
  options?: string[]
}

interface Candidate {
  id: string
  name: string
  level: string
  selectedInterviewer?: string | null
}

interface Props {
  candidate: Candidate
  questions: Question[]
  role: string
  token?: string
}

export default function PublicFormClient({ candidate, questions, role, token }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selectedInterviewer] = useState(candidate.selectedInterviewer || "Belum ditentukan")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const isSD = candidate.level === "SD"

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(answers).length > 0 && !isDone) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [answers, isDone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/form/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          selectedInterviewer,
          answers: Object.fromEntries(Object.entries(answers).filter(([k]) => !k.startsWith('sys_'))),
          parentPhone: answers['sys_phone'],
          correctedName: answers['sys_name_corr'],
          role,
          token,
        }),
      })

      if (res.ok) {
        setIsDone(true)
        window.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        const data = await res.json()
        alert(data.error || "Gagal mengirim data")
      }
    } catch (err) {
      alert("Terjadi kesalahan koneksi. Silakan coba lagi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isDone) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl p-8 text-center space-y-6 shadow-sm border border-slate-200">
          <div className={cn(
            "h-16 w-16 rounded-full flex items-center justify-center mx-auto shadow-lg", 
            isSD ? "bg-sd text-white" : "bg-smp text-white"
          )}>
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Terkirim</h1>
            <p className="text-[15px] text-slate-500 font-medium">
              Jawaban untuk <span className="font-bold">{candidate.name}</span> telah berhasil disimpan.
            </p>
          </div>
          <Button 
            onClick={() => window.location.href = '/form'}
            className="w-full h-11 rounded-lg bg-slate-900 text-white font-bold text-[13px] hover:bg-black transition-all"
          >
            Selesai
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] py-4 md:py-8 px-3 md:px-4">
      <div className="max-w-[770px] mx-auto space-y-3">
        {/* Main Header Banner */}
        <div className="relative bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <div className={cn(
            "h-2.5 w-full",
            isSD ? "bg-sd" : "bg-smp"
          )} />
          
          {/* Header Image Illustration */}
          <div className="w-full h-32 md:h-48 overflow-hidden bg-slate-100">
            <img 
              src="/header-bg.png" 
              alt="School Header" 
              className="w-full h-full object-cover opacity-90"
            />
          </div>

          <div className="p-6 md:p-8 space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Form Observasi {candidate.level} - Al Fakhir
            </h1>
            <div className="space-y-1">
              <p className="text-[14px] text-slate-600 font-medium">
                Penerimaan Siswa Baru TA {getAcademicYear()}
              </p>
              <p className="text-[13px] text-slate-500">
                Responden: <span className="font-bold text-slate-700">{role === 'student' ? 'Calon Siswa' : 'Orang Tua'}</span>
              </p>
            </div>
            <div className="h-px bg-slate-100 w-full" />
            <div className="flex flex-col md:flex-row gap-4 md:gap-8">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nama Siswa</span>
                <span className="text-[15px] font-bold text-slate-800">{candidate.name}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pewawancara</span>
                <span className="text-[15px] font-bold text-slate-800">{selectedInterviewer}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Cards */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* PERMANENT PARENT QUESTIONS (Hardcoded) */}
          {role === 'parent' && (
            <>
              <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <div className="space-y-1">
                  <h3 className="text-[16px] font-medium text-slate-900 leading-relaxed">
                    Tulis nama ananda yang benar jika ada kesalahan penulisan nama dari kami <span className="text-red-500 ml-0.5">*</span>
                  </h3>
                </div>
                <input
                  required
                  type="text"
                  value={answers['sys_name_corr'] || ""}
                  onChange={(e) => setAnswers({ ...answers, ['sys_name_corr']: e.target.value })}
                  className="w-full bg-transparent border-b border-slate-200 py-2 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-b-2 focus:border-slate-900 transition-all"
                  placeholder="Jawaban Anda"
                />
              </div>

              <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <div className="space-y-1">
                  <h3 className="text-[16px] font-medium text-slate-900 leading-relaxed">
                    Isi nomor telepon aktif yang bisa dihubungi <span className="text-red-500 ml-0.5">*</span>
                  </h3>
                </div>
                <input
                  required
                  type="text"
                  value={answers['sys_phone'] || ""}
                  onChange={(e) => setAnswers({ ...answers, ['sys_phone']: e.target.value })}
                  className="w-full bg-transparent border-b border-slate-200 py-2 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-b-2 focus:border-slate-900 transition-all"
                  placeholder="Contoh: 0812XXXXXXXX"
                />
              </div>
            </>
          )}

          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm space-y-5">
              <div className="space-y-1">
                <h3 className="text-[16px] font-medium text-slate-900 leading-relaxed">
                  {q.text} <span className="text-red-500 ml-0.5">*</span>
                </h3>
              </div>

              <div className="relative">
                {q.type === "long_text" ? (
                  <textarea
                    required
                    rows={1}
                    value={answers[q.id] || ""}
                    onChange={(e) => {
                      setAnswers({ ...answers, [q.id]: e.target.value })
                      e.target.style.height = 'auto'
                      e.target.style.height = e.target.scrollHeight + 'px'
                    }}
                    className="w-full bg-transparent border-b border-slate-200 py-2 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-b-2 focus:border-slate-900 transition-all resize-none min-h-[40px] overflow-hidden"
                    placeholder="Jawaban Anda"
                  />
                ) : q.type === "choice" ? (
                  <div className="space-y-3 pt-2">
                    {q.options?.map((opt) => (
                      <label 
                        key={opt} 
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          answers[q.id] === opt 
                            ? (isSD ? "border-sd bg-sd" : "border-smp bg-smp") 
                            : "border-slate-300 group-hover:border-slate-400"
                        )}>
                          {answers[q.id] === opt && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-[14px] text-slate-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : q.type === "rating" ? (
                  <div className="flex gap-1 md:gap-2 py-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [q.id]: String(num) })}
                        className={cn(
                          "w-10 h-10 rounded-full border text-[14px] font-bold transition-all",
                          answers[q.id] === String(num)
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    required
                    type="text"
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="w-full bg-transparent border-b border-slate-200 py-2 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-b-2 focus:border-slate-900 transition-all"
                    placeholder="Jawaban Anda"
                  />
                )}
              </div>
            </div>
          ))}

          {/* Submit Action */}
          <div className="pt-4 flex items-center justify-between">
            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "h-10 px-8 rounded-md text-white text-[14px] font-bold transition-all shadow-sm",
                isSD ? "bg-sd hover:bg-orange-600" : "bg-smp hover:bg-teal-800"
              )}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "SUBMIT"}
            </Button>
            <button 
              type="button"
              onClick={() => setAnswers({})}
              className="text-[13px] text-slate-500 font-medium hover:text-slate-800"
            >
              Hapus formulir
            </button>
          </div>
          
          <div className="pt-10 pb-20 text-center space-y-2">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Al Fakhir Modern Islamic School</p>
            <p className="text-[10px] text-slate-400 font-medium">Developer by Feri</p>
          </div>
        </form>
      </div>
    </div>
  )
}
