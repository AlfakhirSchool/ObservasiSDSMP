"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronRight, ChevronLeft, GraduationCap, CheckCircle2, AlertCircle, User } from "lucide-react"

interface Question {
  id: string
  text: string
  subject: string
  imageUrl?: string
  options: string[]
  order: number
}

export default function AcademicClient({ candidate }: { candidate: any }) {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch("/api/academic/questions")
      .then(res => res.json())
      .then(data => {
        setQuestions(data)
        setLoading(false)
      })
  }, [])

  const handleSelect = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }))
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/academic/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id, answers })
      })
      if (res.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error(error)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest animate-pulse">Menyiapkan Materi...</p>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100
  const answeredCount = Object.keys(answers).length

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-primary/10">
      {/* Header Container */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <header className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="text-primary h-6 w-6" />
            </div>
            <div>
              <h1 className="text-slate-900 font-black text-[16px] leading-tight uppercase tracking-tight">Observasi Akademik</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <User size={12} className="text-slate-400" />
                <p className="text-slate-500 text-[12px] font-bold tracking-tight">{candidate.name}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
              <span className={cn(
                "text-[14px] font-black italic transition-colors",
                answeredCount === questions.length ? "text-emerald-500" : "text-primary"
              )}>
                {answeredCount} / {questions.length}
              </span>
            </div>
            <Button 
              onClick={handleSubmit}
              disabled={submitting || answeredCount < questions.length}
              className={cn(
                "font-black uppercase tracking-widest text-[11px] h-11 px-8 rounded-2xl transition-all active:scale-95",
                answeredCount === questions.length 
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20" 
                  : "bg-slate-200 text-slate-400 cursor-not-allowed border-none shadow-none"
              )}
            >
              {submitting ? "Mengirim..." : "Selesai & Kirim"}
            </Button>
          </div>
        </header>
        {/* Progress Bar */}
        <div className="h-[3px] bg-slate-100 w-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-700 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-6 pt-12 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Question Area */}
          <div className="lg:col-span-8 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border shadow-sm",
                  currentQuestion?.subject === "Matematika" ? "bg-blue-50 text-blue-600 border-blue-100" :
                  currentQuestion?.subject === "Bahasa Indonesia" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                  currentQuestion?.subject === "Bahasa Inggris" ? "bg-purple-50 text-purple-600 border-purple-100" :
                  "bg-amber-50 text-amber-600 border-amber-100"
                )}>
                  {currentQuestion?.subject}
                </span>
                <div className="h-1 w-1 bg-slate-300 rounded-full" />
                <span className="text-slate-400 text-[12px] font-bold tracking-tight">Pertanyaan ke {currentIndex + 1}</span>
              </div>
              <h2 className="text-[24px] md:text-[32px] font-black text-slate-900 leading-[1.2] tracking-tight">
                {currentQuestion?.text}
              </h2>
              
              {currentQuestion?.imageUrl && (
                <div className="bg-white p-4 rounded-[32px] border-2 border-slate-100 shadow-sm overflow-hidden flex items-center justify-center mx-auto max-w-lg">
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Question image" 
                    className="max-w-full h-auto rounded-2xl"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              {currentQuestion?.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(currentQuestion.id, option)}
                  className={cn(
                    "w-full text-left p-6 rounded-[24px] border-2 transition-all duration-300 flex items-center gap-5 group",
                    answers[currentQuestion.id] === option 
                      ? "bg-primary/5 border-primary text-slate-900 shadow-lg shadow-primary/5" 
                      : "bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50 shadow-sm"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center font-black text-[16px] shrink-0 transition-all",
                    answers[currentQuestion.id] === option 
                      ? "bg-primary text-white scale-110" 
                      : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                  )}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-[17px] font-bold leading-relaxed">{option}</span>
                  {answers[currentQuestion.id] === option && (
                    <div className="ml-auto w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-in zoom-in duration-300">
                      <CheckCircle2 className="text-white h-4 w-4" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-10 border-t border-slate-200">
              <Button
                variant="ghost"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setCurrentIndex(prev => Math.max(0, prev - 1));
                }}
                disabled={currentIndex === 0}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 h-14 px-8 rounded-2xl font-bold"
              >
                <ChevronLeft className="mr-2 h-5 w-5" />
                Kembali
              </Button>
              <Button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  if (currentIndex < questions.length - 1) {
                    setCurrentIndex(prev => prev + 1)
                  } else {
                    handleSubmit()
                  }
                }}
                disabled={currentIndex === questions.length - 1 && (submitting || answeredCount < questions.length)}
                className={cn(
                  "font-bold h-14 px-10 rounded-2xl transition-all active:scale-95 flex items-center gap-2",
                  currentIndex === questions.length - 1 
                    ? (answeredCount === questions.length ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20" : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none")
                    : "bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10"
                )}
              >
                {currentIndex === questions.length - 1 ? "Selesai & Kirim" : "Soal Berikutnya"}
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-[32px] p-8 sticky top-32 shadow-sm">
              <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Navigasi Soal</h3>
              <div className="grid grid-cols-5 gap-3">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "aspect-square rounded-xl flex items-center justify-center text-[13px] font-black transition-all border",
                      currentIndex === idx 
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-110 z-10" 
                        : answers[q.id] 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300"
                    )}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-slate-100 space-y-5">
                <div className="flex justify-between items-center text-[12px] font-black px-1">
                  <span className="text-slate-400 uppercase tracking-widest">Terjawab</span>
                  <span className="text-primary italic">{answeredCount} / {questions.length}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-700 ease-out" 
                    style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                  />
                </div>
                
                {answeredCount < questions.length ? (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 mt-6 animate-in fade-in duration-500">
                    <AlertCircle className="text-amber-500 h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 font-bold leading-relaxed italic">
                      Masih ada {questions.length - answeredCount} soal yang belum diisi. Pastikan semua terjawab ya!
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mt-6 animate-in zoom-in duration-500">
                    <CheckCircle2 className="text-emerald-500 h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-emerald-700 font-black leading-relaxed italic uppercase tracking-tight">
                      Luar biasa! Semua soal sudah terisi. Kamu bisa mengirim jawabanmu sekarang.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
