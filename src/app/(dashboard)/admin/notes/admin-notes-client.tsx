"use client"

import { useState, useMemo } from "react"
import { InterviewerNote } from "@/types"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  BarChart3,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { formatDate, cn } from "@/lib/utils"
import { ITEMS_PER_PAGE } from "@/lib/constants"

interface Props {
  notes: InterviewerNote[]
}

type Recommendation = InterviewerNote["recommendation"]

const REC_META: Record<Recommendation, { color: string; pill: string; text: string }> = {
  Terima: {
    color: "#10B981",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    text: "text-emerald-600",
  },
  Pertimbangkan: {
    color: "#F59E0B",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
    text: "text-amber-600",
  },
  Tolak: {
    color: "#F43F5E",
    pill: "bg-rose-50 text-rose-700 ring-rose-200",
    text: "text-rose-600",
  },
}

const REC_ORDER: Recommendation[] = ["Terima", "Pertimbangkan", "Tolak"]

export default function AdminNotesClient({ notes }: Props) {
  const availableYears = useMemo(() => {
    const years = [...new Set(notes.map((n) => n.academicYear).filter(Boolean))] as string[]
    years.sort((a, b) => b.localeCompare(a))
    return years
  }, [notes])

  const [yearFilter, setYearFilter] = useState(availableYears[0] || "")
  const [interviewerFilter, setInterviewerFilter] = useState("")
  const [recFilter, setRecFilter] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const interviewers = useMemo(() => {
    const names = [...new Set(notes.map((n) => n.interviewerName))]
    return [
      { value: "", label: "Semua Pewawancara" },
      ...names.map((n) => ({ value: n, label: n })),
    ]
  }, [notes])

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      const matchYear = !yearFilter || yearFilter === "all" || n.academicYear === yearFilter
      const matchInterviewer = !interviewerFilter || n.interviewerName === interviewerFilter
      const matchRec = !recFilter || n.recommendation === recFilter
      return matchYear && matchInterviewer && matchRec
    })
  }, [notes, yearFilter, interviewerFilter, recFilter])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const recStats = useMemo(() => {
    const counts = notes.reduce(
      (acc, n) => {
        acc[n.recommendation] = (acc[n.recommendation] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    return REC_ORDER.map((r) => ({
      name: r,
      value: counts[r] || 0,
    }))
  }, [notes])

  const handleExport = (format: "xlsx" | "csv") => {
    window.open(`/api/admin/export?format=${format}&type=notes`, "_blank")
  }

  const resetFilters = () => {
    setYearFilter(availableYears[0] || "")
    setInterviewerFilter("")
    setRecFilter("")
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catatan Observasi"
        description={`${notes.length} catatan telah dikirim`}
        actions={
          <>
            <Button variant="outline" onClick={() => handleExport("xlsx")}>
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport("csv")}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="min-w-0 self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="text-base font-semibold text-slate-900">Ringkasan rekomendasi</h2>
          <p className="text-sm text-slate-500">Dari seluruh catatan yang masuk</p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {recStats.map((r) => (
              <div key={r.name} className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                <p className={cn("text-2xl font-bold tabular-nums", REC_META[r.name].text)}>{r.value}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">{r.name}</p>
              </div>
            ))}
          </div>

          {notes.length > 0 ? (
            <div className="mt-4 h-44 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={recStats} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#475569" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#475569" }}
                    width={104}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#F1F5F9" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 13 }}
                  />
                  <Bar dataKey="value" name="Jumlah" radius={[0, 6, 6, 0]} maxBarSize={24}>
                    {recStats.map((entry) => (
                      <Cell key={entry.name} fill={REC_META[entry.name].color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="Belum ada data rekomendasi"
              description="Grafik muncul setelah catatan pertama dikirim."
              className="py-10"
            />
          )}
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-slate-900">Daftar catatan</h2>
            <div className="flex flex-wrap gap-2">
              {availableYears.length > 0 && (
                <div className="min-w-44 flex-1 sm:flex-none">
                  <Select
                    aria-label="Filter tahun ajaran"
                    options={[
                      ...availableYears.map((y, idx) => ({ 
                        value: y, 
                        label: idx === 0 ? `TA ${y} (Baru)` : `TA ${y}` 
                      })),
                      { value: "all", label: "Semua Tahun" },
                    ]}
                    value={yearFilter}
                    onChange={(e) => {
                      setYearFilter(e.target.value)
                      setPage(1)
                    }}
                  />
                </div>
              )}
              <div className="min-w-48 flex-1 sm:flex-none">
                <Select
                  aria-label="Filter pewawancara"
                  options={interviewers}
                  value={interviewerFilter}
                  onChange={(e) => {
                    setInterviewerFilter(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
              <div className="min-w-48 flex-1 sm:flex-none">
                <Select
                  aria-label="Filter rekomendasi"
                  options={[
                    { value: "", label: "Semua Rekomendasi" },
                    ...REC_ORDER.map((r) => ({ value: r, label: r })),
                  ]}
                  value={recFilter}
                  onChange={(e) => {
                    setRecFilter(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
            </div>
          </div>

          {notes.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Belum ada catatan observasi"
              description="Catatan dari pewawancara akan tampil di sini."
            />
          ) : paginated.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Tidak ada catatan ditemukan"
              description="Tidak ada catatan yang cocok dengan filter yang dipilih."
              action={
                <Button variant="outline" onClick={resetFilters}>
                  Reset filter
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {paginated.map((note) => {
                const isExpanded = expandedId === note.noteId
                const pill = REC_META[note.recommendation]?.pill ?? "bg-slate-50 text-slate-600 ring-slate-200"
                return (
                  <li key={note.noteId}>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedId(isExpanded ? null : note.noteId)}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {note.candidateName || note.candidateId}
                        </p>
                        <p className="text-sm text-slate-500">
                          Oleh: {note.interviewerName} · {formatDate(note.submittedAt)}
                        </p>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", pill)}>
                        {note.recommendation}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="mx-5 mb-4 space-y-3 rounded-xl bg-slate-50 p-4">
                        {[
                          { label: "Observasi Umum", value: note.observation },
                          { label: "Kesiapan Akademik", value: note.academicAssessment },
                          { label: "Dukungan Keluarga", value: note.familySupport },
                          { label: "Karakter & Sikap", value: note.characterNotes },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                            <p className="text-sm leading-relaxed text-slate-700">{value}</p>
                          </div>
                        ))}
                        {note.aiSummary && (
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Ringkasan AI</p>
                            <p className="line-clamp-3 text-sm leading-relaxed text-slate-500">{note.aiSummary}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-sm text-slate-500 tabular-nums">
                {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} dari {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Halaman sebelumnya"
                  title="Halaman sebelumnya"
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium text-slate-700 tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Halaman berikutnya"
                  title="Halaman berikutnya"
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
