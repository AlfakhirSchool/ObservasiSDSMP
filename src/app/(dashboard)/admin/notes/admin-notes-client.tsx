"use client"

import { useState, useMemo } from "react"
import { InterviewerNote } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import {
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
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
import { formatDate } from "@/lib/utils"
import { ITEMS_PER_PAGE } from "@/lib/constants"

interface Props {
  notes: InterviewerNote[]
}

const REC_COLORS: Record<string, string> = {
  Terima: "#10b981",
  Pertimbangkan: "#f59e0b",
  Tolak: "#f43f5e",
}

export default function AdminNotesClient({ notes }: Props) {
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
      const matchInterviewer = !interviewerFilter || n.interviewerName === interviewerFilter
      const matchRec = !recFilter || n.recommendation === recFilter
      return matchInterviewer && matchRec
    })
  }, [notes, interviewerFilter, recFilter])

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
    return ["Terima", "Pertimbangkan", "Tolak"].map((r) => ({
      name: r,
      value: counts[r] || 0,
    }))
  }, [notes])

  const handleExport = (format: "xlsx" | "csv") => {
    window.open(`/api/admin/export?format=${format}&type=notes`, "_blank")
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catatan Observasi</h1>
          <p className="text-sm text-slate-500 mt-1">
            {notes.length} catatan telah dikirim
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}>
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Summary chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Ringkasan Rekomendasi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={recStats} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  width={90}
                />
                <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "13px" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {recStats.map((entry) => (
                    <Cell key={entry.name} fill={REC_COLORS[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-around mt-2">
              {recStats.map((r) => (
                <div key={r.name} className="text-center">
                  <p className="text-lg font-bold" style={{ color: REC_COLORS[r.name] }}>
                    {r.value}
                  </p>
                  <p className="text-xs text-slate-500">{r.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <CardTitle>Daftar Catatan</CardTitle>
              <div className="flex gap-2 ml-auto">
                <Select
                  options={interviewers}
                  value={interviewerFilter}
                  onChange={(e) => { setInterviewerFilter(e.target.value); setPage(1) }}
                  className="w-44"
                />
                <Select
                  options={[
                    { value: "", label: "Semua Rekomendasi" },
                    { value: "Terima", label: "Terima" },
                    { value: "Pertimbangkan", label: "Pertimbangkan" },
                    { value: "Tolak", label: "Tolak" },
                  ]}
                  value={recFilter}
                  onChange={(e) => { setRecFilter(e.target.value); setPage(1) }}
                  className="w-44"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <p className="text-center py-10 text-slate-400 text-sm">
                  Tidak ada catatan ditemukan
                </p>
              ) : (
                paginated.map((note) => {
                  const isExpanded = expandedId === note.noteId
                  return (
                    <div key={note.noteId} className="px-5 py-4">
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : note.noteId)
                        }
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 text-sm">
                            {note.candidateName || note.candidateId}
                          </p>
                          <p className="text-xs text-slate-500">
                            Oleh: {note.interviewerName} ·{" "}
                            {formatDate(note.submittedAt)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            note.recommendation === "Terima"
                              ? "success"
                              : note.recommendation === "Tolak"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {note.recommendation}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      {isExpanded && (
                        <div className="mt-4 space-y-3 bg-slate-50 rounded-xl p-4">
                          {[
                            { label: "Observasi Umum", value: note.observation },
                            { label: "Kesiapan Akademik", value: note.academicAssessment },
                            { label: "Dukungan Keluarga", value: note.familySupport },
                            { label: "Karakter & Sikap", value: note.characterNotes },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                {label}
                              </p>
                              <p className="text-sm text-slate-700 leading-relaxed">
                                {value}
                              </p>
                            </div>
                          ))}
                          {note.aiSummary && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                Ringkasan AI
                              </p>
                              <p className="text-xs text-slate-500 italic leading-relaxed line-clamp-3">
                                {note.aiSummary}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  {(page - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(page * ITEMS_PER_PAGE, filtered.length)} dari{" "}
                  {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
