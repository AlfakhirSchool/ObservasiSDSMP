"use client"

import { useState, useMemo } from "react"
import {
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle2,
  HelpCircle,
  QrCode,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"

export interface AnswerEntry {
  id: string
  value: string
  question: {
    id: string
    text: string
    category: string
    section: string | null
    order: number
    required?: boolean
  }
}

interface Props {
  parentAnswers: AnswerEntry[]
  studentAnswers: AnswerEntry[]
  isSd: boolean
  onShowQr: () => void
}

export default function FormAnswersViewer({
  parentAnswers,
  studentAnswers,
  isSd,
  onShowQr,
}: Props) {
  // Tab aktif (untuk SMP: orang tua vs siswa)
  const [activeTab, setActiveTab] = useState<"parent" | "student">("parent")
  const [search, setSearch] = useState("")

  const activeEntries = activeTab === "parent" ? parentAnswers : studentAnswers

  // Kelompokkan jawaban berdasarkan `section` pertanyaan
  const groupedSections = useMemo(() => {
    const q = search.trim().toLowerCase()
    const map = new Map<string, AnswerEntry[]>()

    for (const entry of activeEntries) {
      const matchSearch =
        !q ||
        entry.question.text.toLowerCase().includes(q) ||
        (entry.value && entry.value.toLowerCase().includes(q))

      if (!matchSearch) continue

      const sectionTitle = entry.question.section?.trim() || "Data Umum & Lainnya"
      const currentList = map.get(sectionTitle) || []
      currentList.push(entry)
      map.set(sectionTitle, currentList)
    }

    return Array.from(map.entries()).map(([title, items]) => ({
      title,
      items: items.sort((a, b) => a.question.order - b.question.order),
      answeredCount: items.filter((i) => i.value && i.value.trim() !== "").length,
    }))
  }, [activeEntries, search])

  // State untuk collapsible accordion per section
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: prev[title] === undefined ? false : !prev[title],
    }))
  }

  const isSectionOpen = (title: string) => {
    return openSections[title] ?? true // default terbuka
  }

  const toggleAll = (open: boolean) => {
    const next: Record<string, boolean> = {}
    for (const sec of groupedSections) {
      next[sec.title] = open
    }
    setOpenSections(next)
  }

  const totalAnswered = activeEntries.filter((e) => e.value && e.value.trim() !== "").length

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header Bagian Jawaban Formulir */}
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">Jawaban Formulir</h2>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {totalAnswered} / {activeEntries.length} terjawab
            </span>
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            {isSd
              ? "Hasil isian kuesioner dari orang tua calon siswa"
              : "Hasil isian dari orang tua dan wawancara calon siswa"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onShowQr}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <QrCode size={14} aria-hidden="true" />
            QR Formulir
          </button>
        </div>
      </div>

      {/* Switch Tab (Jika bukan SD: ada Orang Tua & Calon Siswa) */}
      {!isSd && (
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 pt-3 sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("parent")}
              className={cn(
                "border-b-2 px-3 py-2 text-xs sm:text-sm font-semibold transition-colors",
                activeTab === "parent"
                  ? "border-emerald-600 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Observasi Orang Tua ({parentAnswers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("student")}
              className={cn(
                "border-b-2 px-3 py-2 text-xs sm:text-sm font-semibold transition-colors",
                activeTab === "student"
                  ? "border-emerald-600 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Wawancara Calon Siswa ({studentAnswers.length})
            </button>
          </div>
        </div>
      )}

      {/* Toolbar Pencarian & Toggle Expand/Collapse */}
      <div className="flex flex-col gap-2.5 border-b border-slate-100 bg-slate-50/50 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pertanyaan atau kata kunci jawaban..."
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => toggleAll(true)}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition"
          >
            Buka Semua
          </button>
          <span className="text-slate-300">·</span>
          <button
            type="button"
            onClick={() => toggleAll(false)}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition"
          >
            Tutup Semua
          </button>
        </div>
      </div>

      {/* Container Jawaban Formulir: dibatasi ketinggiannya (max-h) agar tidak memanjang ratusan baris */}
      <div className="max-h-[540px] overflow-y-auto p-4 sm:p-5 space-y-4">
        {activeEntries.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={
              activeTab === "parent"
                ? "Menunggu jawaban formulir dari orang tua"
                : "Menunggu jawaban wawancara dari calon siswa"
            }
            className="py-8"
          />
        ) : groupedSections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
            <p className="text-sm font-medium text-slate-700">Tidak ada pertanyaan yang cocok</p>
            <p className="mt-1 text-xs text-slate-500">Coba ubah kata kunci pencarian Anda.</p>
          </div>
        ) : (
          groupedSections.map((sec) => {
            const open = isSectionOpen(sec.title)
            return (
              <div
                key={sec.title}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
              >
                {/* Header Bagian / Section */}
                <button
                  type="button"
                  onClick={() => toggleSection(sec.title)}
                  className="flex w-full items-center justify-between bg-slate-50/90 px-4 py-3 text-left transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
                      <Layers size={13} aria-hidden="true" />
                    </span>
                    <span className="truncate text-sm font-bold text-slate-800">
                      {sec.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {sec.answeredCount} / {sec.items.length}
                    </span>
                  </div>

                  <div className="shrink-0 text-slate-400">
                    {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                </button>

                {/* Konten Grid Pertanyaan & Jawaban: 2 kolom modern & ringkas */}
                {open && (
                  <div className="p-3 sm:p-4">
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {sec.items.map((entry, idx) => {
                        const hasVal = entry.value && entry.value.trim() !== ""
                        return (
                          <div
                            key={entry.id}
                            className={cn(
                              "flex flex-col justify-between rounded-xl border p-3 transition-colors",
                              hasVal
                                ? "border-slate-200 bg-white hover:border-slate-300"
                                : "border-slate-100 bg-slate-50/50"
                            )}
                          >
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold leading-snug text-slate-700">
                                <span className="mr-1 text-slate-400">{idx + 1}.</span>
                                {entry.question.text}
                              </p>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-slate-100/80">
                              {hasVal ? (
                                <p className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-900 leading-relaxed">
                                  {entry.value}
                                </p>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                                  <HelpCircle size={11} aria-hidden="true" />
                                  Belum dijawab
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
