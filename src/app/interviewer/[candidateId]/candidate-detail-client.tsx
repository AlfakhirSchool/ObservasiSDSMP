"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import type { InterviewerNote, Prisma } from "@prisma/client"
import { cn, formatDate } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Textarea } from "@/components/ui/input"
import FormAnswersViewer from "./form-answers-viewer"
import { Dialog } from "@/components/ui/dialog"
import { SkeletonSummary } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Sparkles,
  Lock,
  RefreshCw,
  Send,
  AlertTriangle,
  AlertCircle,
  CalendarDays,
  CheckCircle,
  DoorOpen,
  Download,
  FileText,
  GraduationCap,
  ListChecks,
  QrCode,
  UserRound,
  X,
  XCircle,
} from "lucide-react"

export type CandidateDetail = Prisma.CandidateGetPayload<{
  include: {
    notes: true
    aiSummary: true
    academicTestResult: true
    academicResponses: { include: { question: true } }
    formAnswers: { include: { question: true } }
  }
}>

interface Props {
  candidate: CandidateDetail
  existingNote: InterviewerNote | null
  savedSummary: string | null
  /** Nama pewawancara yang sedang login; dicatat otomatis oleh server. */
  interviewerName: string
  /** Unduh raport hanya untuk admin. */
  canDownload: boolean
  candidateToken?: string
}

interface SubjectScore {
  correct: number
  total: number
}

type Recommendation = "Terima" | "Pertimbangkan" | "Tolak"

function isRecommendation(value: string | undefined): value is Recommendation {
  return value === "Terima" || value === "Pertimbangkan" || value === "Tolak"
}

function parseSubjectScores(raw: string): [string, SubjectScore][] {
  try {
    const parsed: Record<string, SubjectScore> = JSON.parse(raw)
    return Object.entries(parsed)
  } catch {
    return []
  }
}

const RECOMMENDATION_OPTIONS = [
  {
    value: "Terima",
    label: "Terima",
    icon: CheckCircle,
    selectedClass: "border-emerald-500 bg-emerald-50 text-emerald-700",
  },
  {
    value: "Pertimbangkan",
    label: "Pertimbangkan",
    icon: AlertTriangle,
    selectedClass: "border-amber-500 bg-amber-50 text-amber-700",
  },
  {
    value: "Tolak",
    label: "Tolak",
    icon: XCircle,
    selectedClass: "border-rose-500 bg-rose-50 text-rose-700",
  },
] as const

const CARD_CLASS = "rounded-2xl border border-slate-200 bg-white shadow-sm"
const CARD_HEADER_CLASS = "border-b border-slate-100 px-5 py-4"
const PILL_BASE = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset"
const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"
const BTN_PRIMARY = cn(BTN_BASE, "bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700")
const BTN_SECONDARY = cn(BTN_BASE, "border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50")
const BTN_SECONDARY_SM = cn(BTN_BASE, "border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50")
const BTN_PRIMARY_FULL = cn(BTN_PRIMARY, "w-full")
const BTN_SECONDARY_FULL = cn(BTN_SECONDARY, "w-full")

// Simple markdown-to-HTML renderer (ES2017 compatible)
function renderMarkdown(text: string) {
  return text
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[^<]*<\/li>)/g, '<ul>$1</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Highlight Percentage
    .replace(/(\d+)%/g, '<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">$1%</span>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hlu])/gm, '')
}

export default function CandidateDetailClient({
  candidate,
  existingNote,
  savedSummary,
  interviewerName,
  canDownload,
  candidateToken,
}: Props) {
  const router = useRouter()

  // Notes form state
  const [observation, setObservation] = useState(existingNote?.observation || "")
  const [academicAssessment, setAcademicAssessment] = useState(existingNote?.academicAssessment || "")
  const [familySupport, setFamilySupport] = useState(existingNote?.familySupport || "")
  const [characterNotes, setCharacterNotes] = useState(existingNote?.characterNotes || "")
  const [otherNotes, setOtherNotes] = useState(existingNote?.otherNotes || "")
  const [recommendation, setRecommendation] = useState<Recommendation | "">(() => {
    const saved = existingNote?.recommendation
    return isRecommendation(saved) ? saved : ""
  })
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showAcademicDetails, setShowAcademicDetails] = useState(false)
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [qrType, setQrType] = useState<"academic" | "form_parent" | "form_student">("academic")

  // AI summary state
  const [summary, setSummary] = useState<string | null>(savedSummary)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])


  const isLocked = existingNote?.isLocked ?? false

  const handleGenerateSummary = async () => {
    const answers = candidate.formAnswers
    if (answers.length === 0) {
      toast.error("Tidak ada data formulir untuk diringkas")
      return
    }
    setGeneratingSummary(true)
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          formResponse: answers.reduce<Record<string, string>>((acc, curr) => {
            if (curr.question) {
              acc[curr.question.text] = curr.value
            }
            return acc
          }, {}),
          candidateName: candidate.name,
          level: candidate.level,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Gagal generate")
      }
      const data = await res.json()
      setSummary(data.summary)
      toast.success("Ringkasan AI berhasil dibuat!")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghasilkan ringkasan AI")
    } finally {
      setGeneratingSummary(false)
    }
  }

  const handleSubmitNote = async () => {
    if (!recommendation) {
      toast.error("Pilih rekomendasi terlebih dahulu")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          observation,
          academicAssessment,
          familySupport,
          characterNotes,
          otherNotes,
          recommendation,
          aiSummary: summary || "",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan")
      toast.success("Catatan berhasil disimpan dan dikunci!")
      setShowConfirm(false)
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const formEntries = [...candidate.formAnswers].sort((a, b) => a.question.order - b.question.order)
  const parentAnswers = formEntries.filter((e) => e.question.category?.trim().toUpperCase() === "ORANG TUA")
  const studentAnswers = formEntries.filter((e) => e.question.category?.trim().toUpperCase() === "SISWA")
  const academicResponses = [...candidate.academicResponses].sort((a, b) => a.question.order - b.question.order)
  const academicResult = candidate.academicTestResult
  const subjectEntries = academicResult ? parseSubjectScores(academicResult.subjectScores) : []
  const showAcademic = candidate.level === "SMP"
  const unitColor = candidate.level === "SMP" ? "#0D5C63" : "#E67E22"

  const missingFields = [
    !observation && "observasi umum",
    !academicAssessment && "kesiapan akademik",
    !familySupport && "dukungan keluarga",
    !characterNotes && "karakter & sikap",
    !recommendation && "rekomendasi",
  ].filter((v): v is string => Boolean(v))
  const canSubmit = missingFields.length === 0

  const lockedFields = [
    { label: "Observasi umum", value: existingNote?.observation },
    { label: "Kesiapan akademik", value: existingNote?.academicAssessment },
    { label: "Dukungan keluarga", value: existingNote?.familySupport },
    { label: "Karakter & sikap", value: existingNote?.characterNotes },
    ...(existingNote?.otherNotes ? [{ label: "Catatan tambahan", value: existingNote.otherNotes }] : []),
  ]

  const lockedRecommendationTone =
    existingNote?.recommendation === "Terima"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : existingNote?.recommendation === "Tolak"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : "bg-amber-50 text-amber-700 ring-amber-200"

  const studentInfo = [
    { label: "Nama siswa", value: candidate.name },
    ...(candidate.correctedName && candidate.correctedName !== candidate.name
      ? [{ label: "Nama koreksi", value: candidate.correctedName }]
      : []),
    { label: "Jenjang", value: candidate.level },
    { label: "Ruangan", value: candidate.room || "-" },
    { label: "Tahun ajaran", value: candidate.academicYear || "-" },
    { label: "Pewawancara", value: candidate.selectedInterviewer || "Belum ditunjuk" },
    { label: "Tanggal daftar", value: formatDate(candidate.createdAt) },
    { label: "Formulir", value: candidate.status === "PENDING" ? "Belum diisi" : "Sudah diisi" },
  ]

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="space-y-3">
        <PageHeader
          badge={
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Kembali ke daftar
            </button>
          }
          title={candidate.name}
          actions={
            isLocked ? (
              <span className={cn(PILL_BASE, "gap-1.5 bg-emerald-50 text-emerald-700 ring-emerald-200")}>
                <Lock size={12} aria-hidden="true" />
                Data terkunci
              </span>
            ) : undefined
          }
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: unitColor }}
          >
            {candidate.level}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <DoorOpen size={14} className="text-slate-400" aria-hidden="true" />
            Ruangan <span className="font-medium text-slate-900">{candidate.room || "-"}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UserRound size={14} className="text-slate-400" aria-hidden="true" />
            Pewawancara{" "}
            <span className="font-medium text-slate-900">
              {candidate.level === "SD" && (!candidate.selectedInterviewer || candidate.selectedInterviewer === "Semua Observer SD")
                ? "Semua Observer SD"
                : (candidate.selectedInterviewer || "Belum ditunjuk")}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={14} className="text-slate-400" aria-hidden="true" />
            <span className="font-medium text-slate-900">{formatDate(candidate.createdAt)}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* LEFT COLUMN */}
        <div className="space-y-6 lg:col-span-3">
          {/* DATA SISWA */}
          <section className={CARD_CLASS}>
            <div className={CARD_HEADER_CLASS}>
              <h2 className="text-base font-semibold text-slate-900">Data siswa</h2>
            </div>
            <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
              {studentInfo.map((item) => (
                <div key={item.label}>
                  <dt className="text-sm text-slate-500">{item.label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-slate-900">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* TAUTAN RAPORT OBSERVASI SD (dikelola di halaman terpisah khusus Raport SD) */}
          {candidate.level === "SD" && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                    <ClipboardList size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-amber-950">Raport Observasi SD</h2>
                    <p className="mt-0.5 text-xs sm:text-sm text-amber-800">
                      Penilaian 20 indikator observasi (Kognitif, Motorik, Al-Qur&apos;an) dan asal sekolah dikelola pada halaman khusus Raport SD.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/interviewer/raport-sd?candidateId=${candidate.id}`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition"
                >
                  <ClipboardList size={16} aria-hidden="true" />
                  Isi Raport SD Siswa Ini
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </section>
          )}

          {/* CATATAN OBSERVASI (Disimpan di atas jawaban formulir orang tua) */}
          <section className={CARD_CLASS}>
            <div className={cn(CARD_HEADER_CLASS, "flex items-center justify-between gap-3")}>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Catatan observasi</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {isLocked ? "Catatan sudah dikirim dan tidak dapat diubah" : "Isi hasil wawancara dan observasi"}
                </p>
              </div>
              {isLocked && <Lock size={18} className="shrink-0 text-emerald-600" aria-hidden="true" />}
            </div>
            <div className="p-5">
              {isLocked ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Catatan sudah dikunci</p>
                      <p className="text-sm text-emerald-700">Dikirim pada {formatDate(existingNote?.createdAt)}</p>
                    </div>
                  </div>
                  <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {lockedFields.map(({ label, value }) => (
                      <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-5 sm:gap-4">
                        <dt className="text-sm text-slate-500 sm:col-span-2">{label}</dt>
                        <dd className="whitespace-pre-wrap text-sm text-slate-900 sm:col-span-3">{value || "-"}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-sm text-slate-500">Rekomendasi</p>
                      <span className={cn(PILL_BASE, "mt-1 px-3 py-1 text-sm", lockedRecommendationTone)}>
                        {existingNote?.recommendation}
                      </span>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm text-slate-500">Pewawancara</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{existingNote?.interviewerName}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <p className="text-sm text-slate-500">
                    Catatan akan dikirim atas nama{" "}
                    <span className="font-semibold text-slate-900">{interviewerName}</span>
                  </p>
                  <Textarea
                    id="note-observation"
                    label="1. Observasi umum *"
                    placeholder="Kesan umum selama wawancara dan observasi"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    className="min-h-[110px]"
                  />
                  <Textarea
                    id="note-academic"
                    label="2. Kesiapan akademik *"
                    placeholder="Kemampuan dan kesiapan belajar siswa"
                    value={academicAssessment}
                    onChange={(e) => setAcademicAssessment(e.target.value)}
                    className="min-h-[110px]"
                  />
                  <Textarea
                    id="note-family"
                    label="3. Dukungan keluarga *"
                    placeholder="Keterlibatan dan dukungan orang tua"
                    value={familySupport}
                    onChange={(e) => setFamilySupport(e.target.value)}
                    className="min-h-[110px]"
                  />
                  <Textarea
                    id="note-character"
                    label="4. Karakter & sikap *"
                    placeholder="Sikap, adab, dan karakter siswa"
                    value={characterNotes}
                    onChange={(e) => setCharacterNotes(e.target.value)}
                    className="min-h-[110px]"
                  />
                  <Textarea
                    id="note-other"
                    label="5. Catatan tambahan (opsional)"
                    placeholder="Hal lain yang perlu dicatat"
                    value={otherNotes}
                    onChange={(e) => setOtherNotes(e.target.value)}
                    className="min-h-[80px]"
                  />

                  <fieldset className="space-y-2 border-t border-slate-100 pt-5">
                    <legend className="text-sm font-medium text-slate-700">Kesimpulan & rekomendasi *</legend>
                    <div role="radiogroup" aria-label="Rekomendasi" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {RECOMMENDATION_OPTIONS.map((opt) => {
                        const selected = recommendation === opt.value
                        const Icon = opt.icon
                        return (
                          <label
                            key={opt.value}
                            className={cn(
                              "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-emerald-500/40",
                              selected ? opt.selectedClass : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <input
                              type="radio"
                              name="recommendation"
                              value={opt.value}
                              checked={selected}
                              onChange={() => setRecommendation(opt.value)}
                              className="sr-only"
                            />
                            <Icon size={16} aria-hidden="true" />
                            {opt.label}
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                </div>
              )}
            </div>
          </section>

          {/* JAWABAN FORMULIR (Sekarang berada di bawah Catatan Observasi, rapi dan tidak memanjang ke bawah) */}
          <FormAnswersViewer
            parentAnswers={parentAnswers}
            studentAnswers={studentAnswers}
            isSd={candidate.level === "SD"}
            onShowQr={() => {
              setQrType("form_parent")
              setShowQrDialog(true)
            }}
          />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6 lg:col-span-2">
          {/* RINGKASAN AI */}
          <section className={CARD_CLASS}>
            <div className={cn(CARD_HEADER_CLASS, "flex items-center gap-3")}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Sparkles size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900">Ringkasan AI</h2>
                <p className="text-sm text-slate-500">Dibuat otomatis dari jawaban formulir</p>
              </div>
            </div>
            <div className="space-y-4 p-5">
              {generatingSummary ? (
                <div aria-live="polite" aria-busy="true">
                  <p className="mb-3 text-sm text-slate-500">Membuat ringkasan, mohon tunggu...</p>
                  <SkeletonSummary />
                </div>
              ) : summary ? (
                <div
                  className="space-y-2 text-sm leading-relaxed text-slate-700 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-slate-900"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }}
                />
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="Belum ada ringkasan"
                  description="Buat ringkasan AI untuk membantu membaca profil siswa dengan cepat."
                  className="py-6"
                />
              )}
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className={summary ? BTN_SECONDARY_FULL : BTN_PRIMARY_FULL}
              >
                {generatingSummary ? (
                  <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles size={16} aria-hidden="true" />
                )}
                {generatingSummary ? "Membuat ringkasan..." : summary ? "Buat ulang ringkasan" : "Buat ringkasan AI"}
              </button>
            </div>
          </section>

          {/* OBSERVASI AKADEMIK */}
          {showAcademic && (
            <section className={CARD_CLASS}>
              <div className={cn(CARD_HEADER_CLASS, "flex items-center justify-between gap-3")}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <GraduationCap size={18} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-900">Observasi akademik</h2>
                    <p className="text-sm text-slate-500">1 soal = 4 poin</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowQrDialog(true)} className={BTN_SECONDARY_SM}>
                  <QrCode size={14} aria-hidden="true" />
                  Akses tes
                </button>
              </div>
              <div className="p-5">
                {academicResult ? (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                      <p className="text-sm text-slate-500">Skor akhir</p>
                      <p className="mt-1 text-4xl font-bold leading-none text-slate-900 tabular-nums">
                        {academicResult.totalScore.toFixed(0)}
                      </p>
                      <div className="mx-auto mt-4 h-2 w-full max-w-48 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, academicResult.totalScore)}%` }} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-900">Performa per mata pelajaran</h3>
                      {subjectEntries.length === 0 ? (
                        <p className="text-sm text-slate-500">Rincian nilai per mata pelajaran tidak tersedia.</p>
                      ) : (
                        subjectEntries.map(([subject, data]) => {
                          const percentage = (data.correct / data.total) * 100
                          return (
                            <div key={subject} className="space-y-1">
                              <div className="flex items-baseline justify-between gap-2 text-sm">
                                <span className="text-slate-700">{subject}</span>
                                <span className="font-medium text-slate-900 tabular-nums">
                                  {percentage.toFixed(0)}{" "}
                                  <span className="font-normal text-slate-500">
                                    ({data.correct}/{data.total})
                                  </span>
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full bg-emerald-500" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    <button type="button" onClick={() => setShowAcademicDetails(true)} className={BTN_SECONDARY_FULL}>
                      <ListChecks size={16} aria-hidden="true" />
                      Lihat detail jawaban
                    </button>
                    {canDownload && candidate.level === "SMP" && (
                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                        <a
                          href={`/surat/${candidate.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(BTN_PRIMARY_FULL, "sm:flex-1")}
                        >
                          <Download size={16} aria-hidden="true" />
                          Unduh Raport (PDF)
                        </a>
                    </div>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={GraduationCap}
                    title="Belum ada hasil tes"
                    description="Tampilkan kode QR agar siswa dapat mengerjakan tes akademik."
                    className="py-6"
                    action={
                      <button type="button" onClick={() => setShowQrDialog(true)} className={BTN_PRIMARY}>
                        <QrCode size={16} aria-hidden="true" />
                        Mulai tes (tampilkan QR)
                      </button>
                    }
                  />
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* STICKY ACTION BAR */}
      {(!isLocked || (showAcademic && academicResult)) && (
        <div className="sticky bottom-4 z-30 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="px-1 text-sm text-slate-600">
            {isLocked
              ? "Catatan observasi sudah terkunci."
              : canSubmit
                ? "Semua kolom wajib sudah terisi. Siap disimpan dan dikunci."
                : `Lengkapi dulu: ${missingFields.join(", ")}.`}
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {canDownload && candidate.level === "SMP" && (
              <a href={`/surat/${candidate.id}`} target="_blank" rel="noreferrer" className={BTN_SECONDARY}>
                <Download size={16} aria-hidden="true" />
                Unduh Raport (PDF)
              </a>
            )}
            {!isLocked && (
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={!canSubmit}
                className={BTN_PRIMARY}
              >
                <Send size={16} aria-hidden="true" />
                Simpan & kunci hasil
              </button>
            )}
          </div>
        </div>
      )}

      {/* DIALOGS */}

      {/* QR Code Access Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog} className="max-w-sm shadow-lg">
        {(() => {
          const targetUrl =
            qrType === "academic"
              ? `${origin}/academic/${candidate.id}${candidateToken ? `?token=${candidateToken}` : ""}`
              : qrType === "form_student"
              ? `${origin}/form/${candidate.id}?role=student${candidateToken ? `&token=${candidateToken}` : ""}`
              : `${origin}/form/${candidate.id}?role=parent${candidateToken ? `&token=${candidateToken}` : ""}`

          const dialogTitle =
            qrType === "academic"
              ? "Akses Tes Akademik"
              : qrType === "form_student"
              ? "Formulir Calon Siswa"
              : "Formulir Orang Tua"

          return (
            <>
              <div className="flex items-start gap-3 p-6 pb-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <QrCode size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">{dialogTitle}</h2>
                  <p className="truncate text-xs text-slate-500 font-medium">{candidate.name}</p>
                </div>
              </div>

              {/* Selector Tabs */}
              <div className="px-6 pb-2">
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                  {candidate.level === "SMP" && (
                    <button
                      type="button"
                      onClick={() => setQrType("academic")}
                      className={cn(
                        "flex-1 rounded-lg py-1.5 transition text-center",
                        qrType === "academic"
                          ? "bg-white text-emerald-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Tes Akademik
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setQrType("form_parent")}
                    className={cn(
                      "flex-1 rounded-lg py-1.5 transition text-center",
                      qrType === "form_parent"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Form Ortu
                  </button>
                  {candidate.level === "SMP" && (
                    <button
                      type="button"
                      onClick={() => setQrType("form_student")}
                      className={cn(
                        "flex-1 rounded-lg py-1.5 transition text-center",
                        qrType === "form_student"
                          ? "bg-white text-emerald-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Form Siswa
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 px-6 pb-5">
                <div className="flex h-[210px] w-[210px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 shadow-inner">
                  {origin ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(targetUrl)}`}
                      alt="QR Code Akses"
                      className="h-[190px] w-[190px]"
                    />
                  ) : (
                    <RefreshCw size={20} className="animate-spin text-slate-400" aria-label="Memuat QR code" />
                  )}
                </div>
                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center space-y-1">
                  <p className="text-[11px] font-medium text-slate-500">Tautan Akses Terotentikasi</p>
                  <p className="select-all break-all text-xs font-mono text-slate-800">{targetUrl}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(targetUrl)
                    toast.success("Tautan berhasil disalin")
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Salin Tautan Akses
                </button>
              </div>

              <div className="flex justify-end border-t border-slate-100 p-3">
                <button type="button" onClick={() => setShowQrDialog(false)} className={BTN_SECONDARY}>
                  Tutup
                </button>
              </div>
            </>
          )
        })()}
      </Dialog>

      {/* Academic Details Dialog */}
      <Dialog
        open={showAcademicDetails}
        onOpenChange={setShowAcademicDetails}
        className="flex max-h-[90vh] w-[95vw] max-w-5xl flex-col overflow-hidden shadow-lg"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <GraduationCap size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">Detail jawaban akademik</h2>
              <p className="truncate text-sm text-slate-500">
                {candidate.name} · Skor: {academicResult?.totalScore.toFixed(0) ?? "-"} · 1 soal = 4 poin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAcademicDetails(false)}
            aria-label="Tutup"
            title="Tutup"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
          {academicResponses.length === 0 ? (
            <EmptyState icon={AlertCircle} title="Data jawaban tidak ditemukan" />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {academicResponses.map((resp, idx) => {
                const isCorrect = resp.isCorrect
                return (
                  <div key={resp.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="truncate text-sm text-slate-500">{resp.question.subject}</span>
                      </div>
                      <span
                        className={cn(
                          PILL_BASE,
                          isCorrect ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
                        )}
                      >
                        {isCorrect ? "Benar" : "Salah"}
                      </span>
                    </div>
                    <p className="mb-4 flex-1 text-sm font-medium leading-relaxed text-slate-900">{resp.question.text}</p>
                    <dl className="grid grid-cols-2 gap-2">
                      <div
                        className={cn(
                          "rounded-lg border p-2.5",
                          isCorrect ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
                        )}
                      >
                        <dt className="text-xs text-slate-600">Jawaban siswa</dt>
                        <dd className={cn("mt-0.5 text-sm font-medium", isCorrect ? "text-emerald-800" : "text-rose-800")}>
                          {resp.answer}
                        </dd>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                        <dt className="text-xs text-slate-600">Kunci jawaban</dt>
                        <dd className="mt-0.5 text-sm font-medium text-slate-900">{resp.question.correctAnswer}</dd>
                      </div>
                    </dl>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-white p-4">
          <button type="button" onClick={() => setShowAcademicDetails(false)} className={BTN_SECONDARY}>
            Tutup
          </button>
        </div>
      </Dialog>

      {/* Confirm Save Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm} className="max-w-md shadow-lg">
        <div className="space-y-4 p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Lock size={22} aria-hidden="true" />
          </span>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-slate-900">Kunci data?</h2>
            <p className="text-sm text-slate-500">
              Data yang sudah dikunci tidak dapat diubah kembali. Pastikan semua hasil observasi sudah benar.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
          <button type="button" onClick={() => setShowConfirm(false)} className={BTN_SECONDARY}>
            Batal
          </button>
          <button type="button" onClick={handleSubmitNote} disabled={submitting} className={BTN_PRIMARY}>
            {submitting && <RefreshCw size={16} className="animate-spin" aria-hidden="true" />}
            {submitting ? "Menyimpan..." : "Ya, kunci"}
          </button>
        </div>
      </Dialog>
    </div>
  )
}
