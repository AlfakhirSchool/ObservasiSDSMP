"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { AlertCircle, Check, CheckCircle2, ChevronLeft, ChevronRight, CloudCheck, Loader2, Send, Sparkles } from "lucide-react"
import { cn, getAcademicYear } from "@/lib/utils"
import { QuestionField, SectionIcon } from "./form-fields"
import {
  SYS_NAME,
  SYS_PHONE,
  buildSteps,
  isMissing,
  isVisible,
  readDraft,
  systemQuestions,
  type Answers,
  type FormCandidate,
  type FormQuestion,
  type Step,
} from "./form-logic"
import { ACCENT, STAR_PATTERN, sectionIntro } from "./form-theme"

interface Props {
  candidate: FormCandidate
  questions: FormQuestion[]
  role: string
  token?: string
}

const subscribeNothing = () => () => {}

export default function PublicFormClient(props: Props) {
  // Draf dibaca dari localStorage, jadi wizard baru dirender di browser (menghindari ketidakcocokan hidrasi).
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false)
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-label="Memuat formulir" />
      </div>
    )
  }
  return <FormWizard {...props} />
}

function FormWizard({ candidate, questions, role, token }: Props) {
  const isSD = candidate.level === "SD"
  const accent = ACCENT[isSD ? "SD" : "SMP"]
  const isParent = role !== "student"
  const draftKey = `form-draft-v1:${candidate.id}:${role}`

  const system = useMemo(() => (isParent ? systemQuestions(candidate.name) : null), [isParent, candidate.name])
  const steps = useMemo(() => buildSteps(questions, system?.questions ?? null), [questions, system])
  const byId = useMemo(() => new Map([...(system?.questions ?? []), ...questions].map((q) => [q.id, q])), [questions, system])

  const [draft] = useState(() => readDraft(draftKey))
  const [answers, setAnswers] = useState<Answers>(() => ({ ...(system?.prefill ?? {}), ...(draft?.answers ?? {}) }))
  const [stepIndex, setStepIndex] = useState(() => Math.min(draft?.step ?? 0, steps.length - 1))
  /** Bagian terjauh yang pernah dibuka; hanya bagian sampai sini yang bisa dilompati lewat daftar bagian. */
  const [furthest, setFurthest] = useState(stepIndex)
  const [errors, setErrors] = useState<ReadonlySet<string>>(new Set())
  // Banner pemulihan hanya bila ada isian nyata selain nama yang terisi otomatis.
  const [restored, setRestored] = useState(() => Object.entries(draft?.answers ?? {}).some(([k, v]) => k !== SYS_NAME && v.trim() !== ""))
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const activePill = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (done) return
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ answers, step: stepIndex }))
    } catch {
      // Penyimpanan penuh atau diblokir: formulir tetap bisa diisi, hanya tanpa simpan otomatis.
    }
  }, [answers, stepIndex, draftKey, done])

  // Jaga bagian aktif tetap terlihat di daftar bagian yang bisa digeser.
  useEffect(() => {
    activePill.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" })
  }, [stepIndex])

  const step = steps[stepIndex]
  const visibleOf = (s: Step) => s.questions.filter((q) => isVisible(q, answers, byId))
  const visibleQuestions = visibleOf(step)
  const isLast = stepIndex === steps.length - 1

  const setAnswer = (id: string, value: string) => setAnswers((prev) => ({ ...prev, [id]: value }))

  const required = steps.flatMap(visibleOf).filter((q) => q.required !== false)
  const answered = required.filter((q) => !isMissing(q, answers)).length
  const percent = required.length === 0 ? 100 : Math.round((answered / required.length) * 100)
  const totalQuestions = steps.reduce((sum, s) => sum + s.questions.length, 0)

  const missingIn = (s: Step) => visibleOf(s).filter((q) => isMissing(q, answers))

  const focusQuestion = (id: string) => {
    requestAnimationFrame(() => document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }))
  }

  const goTo = (index: number) => {
    setStepIndex(index)
    setFurthest((f) => Math.max(f, index))
    setServerError(null)
    setRestored(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const next = () => {
    const missing = missingIn(step)
    if (missing.length > 0) {
      setErrors(new Set(missing.map((q) => q.id)))
      focusQuestion(missing[0].id)
      return
    }
    setErrors(new Set())
    goTo(stepIndex + 1)
  }

  const submit = async () => {
    for (let i = 0; i < steps.length; i++) {
      const missing = missingIn(steps[i])
      if (missing.length > 0) {
        setErrors(new Set(missing.map((q) => q.id)))
        if (i !== stepIndex) goTo(i)
        focusQuestion(missing[0].id)
        return
      }
    }

    setSubmitting(true)
    setServerError(null)
    try {
      // Hanya jawaban pertanyaan yang tampil dan terisi yang dikirim (jawaban sisa dari pertanyaan bersyarat dibuang).
      const real = Object.fromEntries(
        questions
          .filter((q) => isVisible(q, answers, byId) && (answers[q.id] ?? "").trim())
          .map((q) => [q.id, (answers[q.id] ?? "").trim()])
      )
      const res = await fetch("/api/form/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          answers: real,
          parentPhone: isParent ? answers[SYS_PHONE]?.trim() : undefined,
          correctedName: isParent ? answers[SYS_NAME]?.trim() : undefined,
          role,
          token,
        }),
      })
      if (res.ok) {
        try {
          window.localStorage.removeItem(draftKey)
        } catch {
          // diabaikan
        }
        setDone(true)
        window.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        const data: { error?: string } = await res.json().catch(() => ({}))
        setServerError(data.error || "Jawaban belum bisa dikirim. Silakan coba lagi.")
      }
    } catch {
      setServerError("Koneksi bermasalah. Jawaban Anda tersimpan di perangkat ini, silakan coba kirim lagi.")
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    if (!window.confirm("Hapus semua isian dan mulai dari awal?")) return
    try {
      window.localStorage.removeItem(draftKey)
    } catch {
      // diabaikan
    }
    setAnswers({ ...(system?.prefill ?? {}) })
    setErrors(new Set())
    setFurthest(0)
    goTo(0)
  }

  if (done) {
    return (
      <div className={cn("relative flex min-h-screen items-center justify-center overflow-hidden p-4", accent.page)}>
        <div aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-72", accent.hero)} />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-72" style={{ backgroundImage: STAR_PATTERN }} />
        <div className="relative w-full max-w-md space-y-6 rounded-3xl bg-white p-8 text-center shadow-2xl shadow-slate-900/10 ring-1 ring-slate-100">
          <div className="relative mx-auto h-20 w-20">
            <span aria-hidden="true" className={cn("absolute inset-0 rounded-full opacity-30 motion-safe:animate-ping", accent.bar)} />
            <div className={cn("relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg", accent.bar, accent.glow)}>
              <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Jazakumullahu khairan</h1>
            <p className="text-[15px] leading-relaxed text-slate-500">
              Jawaban untuk <span className="font-bold text-slate-800">{answers[SYS_NAME]?.trim() || candidate.name}</span> sudah kami terima.
              Semoga Allah memudahkan urusan Ayah dan Bunda.
            </p>
          </div>
          <button
            type="button"
            onClick={() => (window.location.href = "/form")}
            className="h-12 w-full rounded-xl bg-slate-900 text-[14px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40"
          >
            Selesai
          </button>
        </div>
      </div>
    )
  }

  const intro = sectionIntro(step.title)
  const initial = candidate.name.trim().charAt(0).toUpperCase() || "?"

  return (
    <div className={cn("min-h-screen pb-40", accent.page)}>
      <header className={cn("relative overflow-hidden text-white", accent.hero)}>
        <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: STAR_PATTERN }} />
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-[770px] px-4 pb-14 pt-6 md:px-6 md:pt-8">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg shadow-black/10">
              <img src={isSD ? "/logo-sd.png" : "/logo-smp.png"} alt="" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">Al Fakhir Modern Islamic School</p>
              <h1 className="text-xl font-bold leading-tight md:text-2xl">Formulir Observasi {candidate.level}</h1>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[12px] font-medium">
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">Penerimaan Siswa Baru TA {getAcademicYear()}</span>
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">{isParent ? "Diisi oleh orang tua" : "Diisi oleh calon siswa"}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[770px] px-3 md:px-4">
        <div className="relative -mt-9 rounded-2xl bg-white p-4 shadow-lg shadow-slate-900/[0.07] ring-1 ring-slate-100 space-y-3">
          <div className="flex items-center gap-3.5">
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold", accent.soft, accent.text)} aria-hidden="true">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Calon siswa</p>
              <p className="truncate text-[16px] font-bold text-slate-900">{candidate.name}</p>
              {candidate.selectedInterviewer && <p className="truncate text-[12px] text-slate-500">Pewawancara: {candidate.selectedInterviewer}</p>}
            </div>
          </div>
          {isParent && (
            <div className="rounded-xl bg-amber-50/90 border border-amber-200/80 p-3 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
              <span className="text-sm">💡</span>
              <div>
                <strong>Catatan:</strong> Jika penulisan nama ananda ada yang salah, Ayah/Bunda boleh langsung memperbaikinya dengan menulis ulang nama yang benar pada isian di bawah.
              </div>
            </div>
          )}
        </div>

        <nav aria-label="Bagian formulir" className="sticky top-0 z-20 -mx-3 mt-3 bg-white/90 shadow-sm shadow-slate-900/[0.04] backdrop-blur md:mx-0 md:rounded-2xl">
          <div className="flex items-center justify-between gap-3 px-4 pt-3 text-[13px]">
            <p className="min-w-0 truncate font-semibold text-slate-800">
              <span className={accent.text}>
                {stepIndex + 1}/{steps.length}
              </span>{" "}
              · {step.title}
            </p>
            <p className="shrink-0 font-medium tabular-nums text-slate-500">{percent}% terisi</p>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Kemajuan pengisian"
            className="mx-4 mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
          >
            <div className={cn("h-full rounded-full transition-all duration-500", accent.bar)} style={{ width: `${percent}%` }} />
          </div>
          <ol className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {steps.map((s, i) => {
              const current = i === stepIndex
              const visited = i <= furthest
              const complete = visited && !current && missingIn(s).length === 0
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    ref={current ? activePill : undefined}
                    disabled={!visited || submitting}
                    aria-current={current ? "step" : undefined}
                    aria-label={`Bagian ${i + 1}: ${s.title}${complete ? " (lengkap)" : ""}`}
                    title={s.title}
                    onClick={() => goTo(i)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border text-[13px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                      current && cn("scale-110 border-transparent text-white shadow-md", accent.bar, accent.glow),
                      complete && "border-emerald-200 bg-emerald-50 text-emerald-600",
                      visited && !current && !complete && "border-amber-200 bg-amber-50 text-amber-600",
                      !visited && "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
                    )}
                  >
                    {complete ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : <SectionIcon title={s.title} className="h-4 w-4" />}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        <main className="space-y-3 pt-5">
          {stepIndex === 0 && !restored && (
            <div className={cn("flex gap-3 rounded-2xl p-4 text-[14px] leading-relaxed text-slate-700", accent.soft)}>
              <Sparkles className={cn("mt-0.5 h-5 w-5 shrink-0", accent.text)} aria-hidden="true" />
              <p>
                {isParent ? (
                  <>
                    <span className="font-semibold text-slate-900">Assalamu&apos;alaikum, Ayah dan Bunda.</span> Formulir ini terdiri dari {steps.length} bagian dan{" "}
                    {totalQuestions} pertanyaan. Jawaban tersimpan otomatis, jadi boleh dilanjutkan kapan saja.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-slate-900">Halo!</span> Isi sesuai keadaanmu yang sebenarnya ya. Jawabanmu tersimpan otomatis.
                  </>
                )}
              </p>
            </div>
          )}

          {restored && (
            <p className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[13px] text-slate-600 shadow-sm ring-1 ring-slate-100">
              <CloudCheck className={cn("h-4 w-4 shrink-0", accent.text)} aria-hidden="true" />
              Isian sebelumnya kami pulihkan dari perangkat ini. Silakan lanjutkan.
            </p>
          )}

          <div className="flex items-start gap-3 px-1 pt-1">
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg", accent.bar, accent.glow)}>
              <SectionIcon title={step.title} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight text-slate-900">{step.title}</h2>
              <p className="text-[13px] text-slate-500">
                {intro ? `${intro} · ` : ""}
                {visibleQuestions.length} pertanyaan
              </p>
            </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-3">
            {visibleQuestions.map((q, i) => {
              const hasError = errors.has(q.id) && isMissing(q, answers)
              const optional = q.required === false
              const filled = (answers[q.id] ?? "").trim() !== ""
              return (
                <section
                  key={q.id}
                  id={`q-${q.id}`}
                  className={cn(
                    "rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/[0.04] ring-1 transition-shadow focus-within:shadow-md focus-within:shadow-slate-900/[0.08] md:p-5",
                    hasError ? "ring-2 ring-red-300" : filled ? accent.cardActive : "ring-slate-100"
                  )}
                >
                  <div className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums transition-colors",
                        filled ? "bg-emerald-100 text-emerald-700" : cn(accent.soft, accent.text)
                      )}
                    >
                      {filled ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="space-y-1">
                        <label htmlFor={`f-${q.id}`} className="block text-[16px] font-semibold leading-snug text-slate-900">
                          {q.text}
                          {optional ? (
                            <span className="ml-2 align-middle text-[12px] font-medium text-slate-400">(opsional)</span>
                          ) : (
                            <span className="ml-1 text-red-500" aria-hidden="true">
                              *
                            </span>
                          )}
                        </label>
                        {q.hint && <p className="text-[13px] text-slate-500">{q.hint}</p>}
                      </div>
                      <QuestionField q={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswer(q.id, v)} accent={accent} />
                      {hasError && (
                        <p role="alert" className="flex items-center gap-1.5 text-[13px] font-medium text-red-600">
                          <AlertCircle className="h-4 w-4" aria-hidden="true" />
                          Mohon diisi
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )
            })}
          </form>

          {errors.size > 0 && missingIn(step).length > 0 && (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
              Ada {missingIn(step).length} pertanyaan yang belum diisi. Lengkapi dulu yang ditandai merah.
            </p>
          )}
          {serverError && (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
              {serverError}
            </p>
          )}

          <div className="flex items-center justify-between px-1 pt-2 text-[12px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <CloudCheck className="h-3.5 w-3.5" aria-hidden="true" /> Tersimpan otomatis di perangkat ini
            </span>
            <button type="button" onClick={reset} className="font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline">
              Mulai dari awal
            </button>
          </div>

          <p className="pb-6 pt-8 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">Al Fakhir Modern Islamic School</p>
        </main>
      </div>

      <nav
        aria-label="Navigasi formulir"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-white/95 via-white/70 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8"
      >
        <div className="pointer-events-auto mx-auto flex max-w-[770px] items-center gap-3 rounded-2xl bg-white p-2.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200">
          <button
            type="button"
            onClick={() => goTo(stepIndex - 1)}
            disabled={stepIndex === 0 || submitting}
            aria-label="Kembali ke bagian sebelumnya"
            className="inline-flex h-12 items-center gap-1.5 rounded-xl px-3 text-[14px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:px-4"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Kembali</span>
          </button>
          <p className="hidden flex-1 text-center text-[13px] text-slate-500 sm:block">
            Bagian <span className="font-semibold text-slate-800">{stepIndex + 1}</span> dari {steps.length}
          </p>
          {isLast ? (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className={cn(
                "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-bold text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 sm:flex-none sm:min-w-[190px]",
                accent.solid,
                accent.glow,
                accent.ring
              )}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              {submitting ? "Mengirim..." : "Kirim Jawaban"}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className={cn(
                "inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl px-6 text-[15px] font-bold text-white shadow-md transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 sm:flex-none sm:min-w-[190px]",
                accent.solid,
                accent.glow,
                accent.ring
              )}
            >
              Lanjut
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </nav>
    </div>
  )
}
