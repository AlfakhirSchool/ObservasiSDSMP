"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { startPolling } from "@/lib/polling"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Search,
  Plus,
  Download,
  Upload,
  Trash2,
  QrCode,
  Pencil,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Users,
} from "lucide-react"
import { formatDate, cn } from "@/lib/utils"
import { ITEMS_PER_PAGE, INTERVIEWERS, ROOMS } from "@/lib/constants"
import { PeriodFilter } from "@/components/ui/period-filter"
import { PERIOD_ALL, PERIOD_LATEST, filterByPeriod, listPeriods, type PeriodFilterValue } from "@/lib/period"
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { QRCodeSVG } from "qrcode.react"
import { SuratBulkDialog } from "./surat-bulk-dialog"
import { addCandidate, deleteCandidate, updateCandidateInterviewer, updateCandidateRoom, updateCandidate, updateCandidateStatus, importCandidates } from "@/lib/actions"
import * as XLSX from "xlsx"

interface Candidate {
  id: string
  name: string
  email?: string
  level: string
  status: string
  createdAt: Date
  room?: string
  selectedInterviewer?: string | null
  parentPhone?: string | null
  correctedName?: string | null
  academicYear?: string | null
  gelombang: number
  nim?: string | null
  note?: { recommendation: string } | null
  /** Bentuk dari /api/candidates (polling); halaman awal memakai `note`. */
  notes?: { recommendation: string }[]
  originSchool?: string | null
  sdRaport?: string | null
  academicTestResult?: {
    totalScore: number
    subjectScores: string
    createdAt: Date | string
  } | null
}

interface Props {
  candidates: Candidate[]
}

const thCls = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap border-b border-slate-200"
const controlCls = "h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors hover:border-slate-300 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
const cellSelectCls = "h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 cursor-pointer outline-none transition-colors hover:border-slate-300 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
const iconBtnCls = "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
const menuItemCls = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-50"
const labelCls = "block text-sm font-medium text-slate-700"
const dialogHeaderCls = "border-b border-slate-100 px-6 py-4"
const dialogTitleCls = "text-base font-semibold text-slate-900"

const pillCls = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset"

function isLevel(value: string): value is "SD" | "SMP" {
  return value === "SD" || value === "SMP"
}

function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "RESPONSE_RECEIVED":
      return <span className={cn(pillCls, "bg-blue-50 text-blue-700 ring-blue-200")}>Formulir Masuk</span>
    case "PENDING":
      return <span className={cn(pillCls, "bg-slate-50 text-slate-600 ring-slate-200")}>Belum Ada Formulir</span>
    case "REVIEWED":
      return <span className={cn(pillCls, "bg-emerald-50 text-emerald-700 ring-emerald-200")}>Selesai</span>
    default:
      return <span className={cn(pillCls, "bg-amber-50 text-amber-700 ring-amber-200")}>Menunggu</span>
  }
}

function GradePill({ score }: { score: number }) {
  const grade = score >= 86 ? "A" : score >= 71 ? "B" : score >= 56 ? "C" : "D"
  const tone =
    grade === "A"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : grade === "B"
        ? "bg-blue-50 text-blue-700 ring-blue-200"
        : grade === "C"
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : "bg-rose-50 text-rose-700 ring-rose-200"
  return <span className={cn(pillCls, tone)}>{grade}</span>
}

export default function AdminCandidatesClient({ candidates: initialCandidates }: Props) {
  const router = useRouter()
  const [candidates, setCandidates] = useState(initialCandidates)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null)
  const [isAddingCandidate, setIsAddingCandidate] = useState(false)
  const [addUnit, setAddUnit] = useState<"SD" | "SMP">("SD")
  const [statusFilter, setStatusFilter] = useState("Semua Status")
  const [levelFilter, setLevelFilter] = useState("Semua Jenjang")
  const [period, setPeriod] = useState<PeriodFilterValue>(PERIOD_LATEST)
  const periods = useMemo(() => listPeriods(candidates), [candidates])
  const [origin, setOrigin] = useState("")
  const [role, setRole] = useState("parent")
  const [targetDelete, setTargetDelete] = useState<Candidate | null>(null)
  const [targetReset, setTargetReset] = useState<Candidate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [suratBulkOpen, setSuratBulkOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExportOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [exportOpen])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws) as any[]

        // Map data with flexible column names
        const formatted = data.map(row => ({
          name: row.Nama || row.nama || row.NAME || row.Name,
          level: (row.Jenjang || row.jenjang || row.LEVEL || row.Level || "SD").toString().toUpperCase(),
          room: row.Ruangan || row.ruangan || row.ROOM || row.Room,
          interviewer: row.Pewawancara || row.pewawancara || row.INTERVIEWER || row.Interviewer
        })).filter(c => c.name)

        if (formatted.length === 0) {
          toast.error("Tidak ada data valid yang ditemukan.")
          return
        }

        const res = await importCandidates(formatted)
        if (res.success) {
          toast.success(`${res.count} siswa berhasil diimpor!${(res.skipped ?? 0) > 0 ? ` ${res.skipped} data kembar dilewati.` : ""}`)
          router.refresh()
        } else {
          toast.error(res.error || "Gagal mengimpor.")
        }
      } catch (err) {
        toast.error("Format file tidak didukung.")
      } finally {
        setIsImporting(false)
        e.target.value = "" // Reset
      }
    }
    reader.readAsBinaryString(file)
  }

  // Real-time polling
  useEffect(() => {
    let abortController: AbortController | null = null

    const poll = async () => {
      abortController = new AbortController()
      try {
        const res = await fetch('/api/candidates', { signal: abortController.signal })
        if (res.ok) {
          const data = await res.json()
          setCandidates(data)
        }
      } catch (e: any) {
        // Silently ignore network errors (server restart / offline) and intentional aborts
        if (e?.name !== 'AbortError' && e?.name !== 'TypeError') {
          console.warn("Polling error:", e)
        }
      }
    }

    poll() // initial fetch
    const stopPolling = startPolling(poll, 30000) // 30s dan berhenti saat tab tersembunyi
    return () => {
      stopPolling()
      abortController?.abort()
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  const filtered = useMemo(() => {
    // Mencari nama menembus penyembunyian data lama agar siswa lama tetap bisa ditemukan.
    const effectivePeriod = period === PERIOD_LATEST && search.trim() ? PERIOD_ALL : period
    return filterByPeriod(candidates, effectivePeriod, periods).filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "Semua Status" || 
        (statusFilter === "Formulir Masuk" && c.status === "RESPONSE_RECEIVED") ||
        (statusFilter === "Belum Ada" && c.status === "PENDING") ||
        (statusFilter === "Selesai" && c.status === "REVIEWED")
      const matchesLevel = levelFilter === "Semua Jenjang" || c.level === levelFilter
      
      return matchesSearch && matchesStatus && matchesLevel
    })
  }, [candidates, periods, period, search, statusFilter, levelFilter])

  // Grade conversion: 86-100:A, 71-85:B, 56-70:C, <56:D
  const getGrade = (score: number): { grade: string; label: string } => {
    if (score >= 86) return { grade: "A", label: "Sangat Baik" }
    if (score >= 71) return { grade: "B", label: "Baik" }
    if (score >= 56) return { grade: "C", label: "Cukup" }
    return { grade: "D", label: "Kurang" }
  }

  const exportNilaiToExcel = () => {
    const rows = filtered.map((c, idx) => {
      let bIndo: string | number = "-"
      let mat: string | number = "-"
      let bIng: string | number = "-"
      let agama: string | number = "-"
      let ipa: string | number = "-"
      let nilaiAkhir: string | number = "-"
      let predikat = "-"
      let keterangan = "-"

      if (c.academicTestResult) {
        const totalScore = c.academicTestResult.totalScore
        const { grade, label } = getGrade(totalScore)
        nilaiAkhir = Math.round(totalScore)
        predikat = grade
        keterangan = label

        if (c.academicTestResult.subjectScores) {
          try {
            const scores = JSON.parse(c.academicTestResult.subjectScores)
            if (scores["Bahasa Indonesia"]) bIndo = Math.round((scores["Bahasa Indonesia"].correct / scores["Bahasa Indonesia"].total) * 100)
            if (scores["Matematika"])       mat   = Math.round((scores["Matematika"].correct / scores["Matematika"].total) * 100)
            if (scores["Bahasa Inggris"])  bIng  = Math.round((scores["Bahasa Inggris"].correct / scores["Bahasa Inggris"].total) * 100)
            if (scores["Agama Islam"])     agama = Math.round((scores["Agama Islam"].correct / scores["Agama Islam"].total) * 100)
            if (scores["IPA"])             ipa   = Math.round((scores["IPA"].correct / scores["IPA"].total) * 100)
          } catch (e) { /* ignore */ }
        }
      }

      return {
        "No": idx + 1,
        "Nama Siswa": c.correctedName || c.name,
        "Jenjang": c.level,
        "Ruangan": c.room || "-",
        "Pewawancara": c.selectedInterviewer || "-",
        "Bahasa Indonesia": bIndo,
        "Matematika": mat,
        "Bahasa Inggris": bIng,
        "Agama Islam": agama,
        "IPA": ipa,
        "Nilai Akhir": nilaiAkhir,
        "Predikat": predikat,
        "Keterangan": keterangan,
        "Status Ujian": c.academicTestResult ? "Sudah Ujian" : "Belum Ujian",
      }
    })

    if (rows.length === 0) {
      toast.error("Tidak ada data siswa.")
      return
    }

    // Add legend sheet
    const legend = [
      { "Rentang Nilai": "86 – 100", "Predikat": "A", "Keterangan": "Sangat Baik" },
      { "Rentang Nilai": "71 – 85",  "Predikat": "B", "Keterangan": "Baik" },
      { "Rentang Nilai": "56 – 70",  "Predikat": "C", "Keterangan": "Cukup" },
      { "Rentang Nilai": "< 56",      "Predikat": "D", "Keterangan": "Kurang" },
    ]

    const wb = XLSX.utils.book_new()

    const ws = XLSX.utils.json_to_sheet(rows)
    const colWidths = Object.keys(rows[0]).map(k => ({
      wch: Math.max(k.length, ...rows.map(r => String((r as any)[k] ?? "").length)) + 3
    }))
    ws["!cols"] = colWidths
    XLSX.utils.book_append_sheet(wb, ws, "Nilai Observasi")

    const wsLegend = XLSX.utils.json_to_sheet(legend)
    wsLegend["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsLegend, "Keterangan Predikat")

    XLSX.writeFile(wb, `Nilai_Observasi_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success(`${rows.length} data nilai berhasil diunduh!`)
  }

  const exportToExcel = () => {
    const headers = [
      "Nama Siswa", 
      "Jenjang", 
      "Ruangan", 
      "Status", 
      "Tanggal Pendaftaran",
      "Skor Akhir Akademik",
      "Bahasa Indonesia",
      "Matematika",
      "Bahasa Inggris",
      "Agama Islam",
      "IPA",
      "Password PDF"
    ]
    
    const rows = filtered.map(c => {
      let bIndo = "-"
      let mat = "-"
      let bIng = "-"
      let agama = "-"
      let ipa = "-"
      let totalScoreStr = "-"

      if (c.academicTestResult) {
        totalScoreStr = c.academicTestResult.totalScore.toFixed(0)
        if (c.academicTestResult.subjectScores) {
          try {
            const scores = JSON.parse(c.academicTestResult.subjectScores)
            if (scores["Bahasa Indonesia"]) bIndo = ((scores["Bahasa Indonesia"].correct / scores["Bahasa Indonesia"].total) * 100).toFixed(0)
            if (scores["Matematika"]) mat = ((scores["Matematika"].correct / scores["Matematika"].total) * 100).toFixed(0)
            if (scores["Bahasa Inggris"]) bIng = ((scores["Bahasa Inggris"].correct / scores["Bahasa Inggris"].total) * 100).toFixed(0)
            if (scores["Agama Islam"]) agama = ((scores["Agama Islam"].correct / scores["Agama Islam"].total) * 100).toFixed(0)
            if (scores["IPA"]) ipa = ((scores["IPA"].correct / scores["IPA"].total) * 100).toFixed(0)
          } catch (e) {
            console.error(e)
          }
        }
      }

      return {
        "Nama Siswa": c.correctedName || c.name,
        "Jenjang": c.level,
        "Ruangan": c.room || "-",
        "Status": c.status === "RESPONSE_RECEIVED" ? "Formulir Masuk" : c.status === "PENDING" ? "Belum Ada" : "Selesai",
        "Tanggal Pendaftaran": formatDate(c.createdAt),
        "Skor Akhir Akademik": totalScoreStr === "-" ? "-" : Number(totalScoreStr),
        "Bahasa Indonesia": bIndo === "-" ? "-" : Number(bIndo),
        "Matematika": mat === "-" ? "-" : Number(mat),
        "Bahasa Inggris": bIng === "-" ? "-" : Number(bIng),
        "Agama Islam": agama === "-" ? "-" : Number(agama),
        "IPA": ipa === "-" ? "-" : Number(ipa),
        "NIM (Password PDF)": c.nim ?? ""
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil Observasi")
    
    // Fit column widths
    const maxLens = headers.map(h => h.length)
    rows.forEach(row => {
      Object.keys(row).forEach((key, idx) => {
        const val = (row as any)[key]
        if (val !== undefined && val !== null) {
          maxLens[idx] = Math.max(maxLens[idx], val.toString().length)
        }
      })
    })
    worksheet["!cols"] = maxLens.map(len => ({ wch: len + 3 }))

    XLSX.writeFile(workbook, `Hasil_Observasi_Akademik_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success("Excel berhasil diunduh!")
  }


  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const closeAndRun = (fn: () => void) => {
    setExportOpen(false)
    fn()
  }

  const formLink = (id?: string) =>
    `${origin || "https://dashboard-alfakhir.vercel.app"}/form/${id}${role === "student" ? "?role=student" : ""}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Siswa"
        description="Pantau data siswa dan progres observasi Unit SD & SMP"
        actions={
          <>
            <Button variant="outline" onClick={() => setSuratBulkOpen(true)} className="h-10 gap-2 px-4">
              <FileText size={16} aria-hidden="true" />
              Unduh Raport
            </Button>
            <Button
              onClick={() => setIsAddingCandidate(true)}
              className="h-10 gap-2 bg-emerald-600 px-4 text-white hover:bg-emerald-700"
            >
              <Plus size={16} aria-hidden="true" />
              Tambah Siswa
            </Button>
          </>
        }
      />

      {/* Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1 sm:min-w-[240px]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cari nama siswa"
                placeholder="Cari nama siswa..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className={cn(controlCls, "w-full pl-9 pr-3")}
              />
            </div>
            <select
              aria-label="Filter status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className={cn(controlCls, "cursor-pointer px-3 sm:w-48")}
            >
              <option>Semua Status</option>
              <option>Formulir Masuk</option>
              <option>Belum Ada</option>
              <option>Selesai</option>
            </select>
            <select
              aria-label="Filter jenjang"
              value={levelFilter}
              onChange={(e) => { setLevelFilter(e.target.value); setPage(1) }}
              className={cn(controlCls, "cursor-pointer px-3 sm:w-40")}
            >
              <option>Semua Jenjang</option>
              <option>SD</option>
              <option>SMP</option>
            </select>
            <PeriodFilter periods={periods} value={period} onChange={(v) => { setPeriod(v); setPage(1) }} />
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <input
              type="file"
              id="excel-upload"
              className="hidden"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("excel-upload")?.click()}
              disabled={isImporting}
              className="h-10 gap-2 px-4"
            >
              {isImporting ? (
                <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Upload size={16} aria-hidden="true" />
              )}
              Import Excel
            </Button>

            <div className="relative" ref={exportRef}>
              <Button
                variant="outline"
                onClick={() => setExportOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={exportOpen}
                className="h-10 gap-2 px-4"
              >
                <Download size={16} aria-hidden="true" />
                Ekspor
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={cn("transition-transform", exportOpen && "rotate-180")}
                />
              </Button>
              {exportOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => closeAndRun(exportToExcel)}
                    className={menuItemCls}
                  >
                    <FileSpreadsheet size={16} className="text-emerald-600" aria-hidden="true" />
                    Data (.xlsx)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => closeAndRun(exportNilaiToExcel)}
                    className={menuItemCls}
                  >
                    <FileSpreadsheet size={16} className="text-emerald-600" aria-hidden="true" />
                    Nilai (A/B/C/D) (.xlsx)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">
          Menampilkan <span className="font-semibold tabular-nums text-slate-700">{filtered.length}</span> dari{" "}
          <span className="font-semibold tabular-nums text-slate-700">{candidates.length}</span> siswa
        </p>
      </div>

      <SuratBulkDialog
        open={suratBulkOpen}
        onOpenChange={setSuratBulkOpen}
        candidates={suratBulkOpen ? candidates.map((c) => ({ ...c, note: c.note ?? c.notes?.[0] ?? null })) : []}
      />

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {paginated.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Tidak ada data siswa ditemukan"
            description="Coba ubah kata kunci atau filter, atau tambahkan data siswa baru."
            action={
              <Button
                onClick={() => setIsAddingCandidate(true)}
                className="h-10 gap-2 bg-emerald-600 px-4 text-white hover:bg-emerald-700"
              >
                <Plus size={16} aria-hidden="true" />
                Tambah Siswa
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th className={cn(thCls, "w-14 text-center")}>No</th>
                  <th className={cn(thCls, "min-w-[220px]")}>Nama Siswa</th>
                  <th className={cn(thCls, "w-36")}>Gelombang</th>
                  <th className={cn(thCls, "w-28")}>Jenjang</th>
                  <th className={cn(thCls, "w-28")}>Ruangan</th>
                  <th className={cn(thCls, "min-w-[250px]")}>Pewawancara</th>
                  <th className={cn(thCls, "w-44")}>Status</th>
                  <th className={cn(thCls, "w-32")}>Skor Akademik</th>
                  <th className={cn(thCls, "w-32")}>Tanggal</th>
                  <th className={cn(thCls, "sticky right-0 z-20 w-48 bg-slate-50 text-right shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.08)]")}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((c, i) => {
                  const displayName = c.correctedName || c.name
                  return (
                    <tr key={c.id} className="group hover:bg-slate-50">
                      <td className="px-4 py-3 text-center text-sm tabular-nums text-slate-500">
                        {(page - 1) * ITEMS_PER_PAGE + i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setEditingCandidate(c)}
                          className="group/name block text-left"
                          title="Klik untuk mengedit data siswa"
                        >
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 group-hover/name:text-emerald-700">
                            <span>{displayName}</span>
                            <Pencil size={13} className="text-slate-400 opacity-60 transition-opacity group-hover/name:opacity-100 group-hover/name:text-emerald-600" />
                          </div>
                        </button>
                        <div className="mt-0.5 text-sm text-slate-500">
                          {c.parentPhone ? c.parentPhone : "Belum ada no. HP"}
                        </div>
                        <div className={cn("mt-0.5 text-sm", c.nim ? "text-slate-500" : "text-amber-700")}>
                          {c.nim ? `NIM ${c.nim}` : "NIM belum diisi"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <select
                            aria-label={`Gelombang ${displayName}`}
                            value={c.gelombang}
                            onChange={async (e) => {
                              const val = Number(e.target.value)
                              if (!Number.isInteger(val) || val < 1) return
                              setCandidates(prev => prev.map(item => item.id === c.id ? { ...item, gelombang: val } : item))
                              const res = await updateCandidate(c.id, { gelombang: val })
                              if (res.success) {
                                toast.success(`Gelombang ${displayName} diubah ke Gelombang ${val}`)
                              } else {
                                toast.error("Gagal mengubah gelombang")
                                router.refresh()
                              }
                            }}
                            className={cn(cellSelectCls, "w-32 font-medium text-slate-900")}
                          >
                            <option value={1}>Gelombang 1</option>
                            <option value={2}>Gelombang 2</option>
                            <option value={3}>Gelombang 3</option>
                            <option value={4}>Gelombang 4</option>
                            <option value={5}>Gelombang 5</option>
                          </select>
                          <span className="pl-1 text-xs text-slate-500">TA {c.academicYear ?? "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Jenjang ${displayName}`}
                          defaultValue={c.level}
                          onChange={async (e) => {
                            const value = e.target.value
                            if (isLevel(value)) {
                              setCandidates(prev => prev.map(item => item.id === c.id ? { ...item, level: value } : item))
                              await updateCandidate(c.id, { level: value })
                            }
                          }}
                          className={cn(
                            cellSelectCls,
                            "w-24 font-semibold",
                            c.level === "SD" ? "text-sd" : "text-smp"
                          )}
                        >
                          <option value="SD">SD</option>
                          <option value="SMP">SMP</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {c.level === "SMP" ? (
                          <select
                            aria-label={`Ruangan ${displayName}`}
                            defaultValue={c.room || ""}
                            onChange={async (e) => {
                              await updateCandidateRoom(c.id, e.target.value)
                            }}
                            className={cn(cellSelectCls, "w-24")}
                          >
                            <option value="">-</option>
                            {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : (
                          <span className="text-sm text-slate-400 pl-2">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Pewawancara ${displayName}`}
                          defaultValue={
                            c.level === "SD" && (!c.selectedInterviewer || c.selectedInterviewer === "Semua Observer SD")
                              ? "Semua Observer SD"
                              : (c.selectedInterviewer || "")
                          }
                          onChange={async (e) => {
                            await updateCandidateInterviewer(c.id, e.target.value)
                          }}
                          className={cn(cellSelectCls, "w-full min-w-[14rem]")}
                        >
                          {c.level === "SD" && (
                            <option value="Semua Observer SD">Semua Observer SD</option>
                          )}
                          <option value="">{c.level === "SD" ? "Pilih observer khusus..." : "Pilih pewawancara..."}</option>
                          {INTERVIEWERS.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3">
                        {c.academicTestResult ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold tabular-nums text-slate-900">
                              {c.academicTestResult.totalScore.toFixed(0)}
                            </span>
                            <GradePill score={c.academicTestResult.totalScore} />
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-slate-500">
                        {formatShortDate(c.createdAt)}
                      </td>
                      <td className="sticky right-0 z-10 bg-white px-4 py-3 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.08)] transition-colors group-hover:bg-slate-50">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingCandidate(c)}
                            className={cn(iconBtnCls, "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800")}
                            aria-label={`Edit ${displayName}`}
                            title="Edit Data Siswa"
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedCandidate(c)}
                            className={iconBtnCls}
                            aria-label={`QR Code ${displayName}`}
                            title="QR Code"
                          >
                            <QrCode size={16} aria-hidden="true" />
                          </button>
                          {(c.level === "SMP" || c.level === "SD") && (
                            <a
                              href={`/surat/${c.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className={iconBtnCls}
                              aria-label={`Raport ${displayName}`}
                              title="Raport (surat hasil observasi)"
                            >
                              <FileText size={16} aria-hidden="true" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setTargetReset(c)}
                            className={iconBtnCls}
                            aria-label={`Reset status ${displayName}`}
                            title="Reset Status"
                          >
                            <RefreshCw size={16} aria-hidden="true" />
                          </button>
                          <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
                          <button
                            type="button"
                            onClick={() => setTargetDelete(c)}
                            className={cn(iconBtnCls, "text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700")}
                            aria-label={`Hapus ${displayName}`}
                            title="Hapus"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
            <div className="text-sm text-slate-500">
              Menampilkan <span className="tabular-nums">{(page - 1) * ITEMS_PER_PAGE + 1}</span>–
              <span className="tabular-nums">{Math.min(page * ITEMS_PER_PAGE, filtered.length)}</span> dari{" "}
              <span className="tabular-nums">{filtered.length}</span> siswa
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-9 gap-1 px-3"
              >
                <ChevronLeft size={16} aria-hidden="true" />
                Sebelumnya
              </Button>
              <span className="min-w-[4.5rem] text-center text-sm tabular-nums text-slate-600">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-9 gap-1 px-3"
              >
                Selanjutnya
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Candidate Dialog */}
      <Dialog
        open={!!editingCandidate}
        onOpenChange={() => setEditingCandidate(null)}
        className="max-w-md shadow-xl"
      >
        <DialogHeader className={dialogHeaderCls}>
          <DialogTitle className={dialogTitleCls}>Edit Data Siswa</DialogTitle>
        </DialogHeader>
        <DialogContent className="p-0">
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!editingCandidate) return
              const formData = new FormData(e.currentTarget)
              const name = formData.get("name")
              const level = formData.get("level")
              const gelombang = Number(formData.get("gelombang"))
              const academicYear = String(formData.get("academicYear") ?? "").trim() || undefined
              const nim = String(formData.get("nim") ?? "").trim() || null
              // Hanya ada di form untuk siswa SD; undefined = tidak diubah.
              const originRaw = formData.get("originSchool")
              const originSchool = typeof originRaw === "string" ? originRaw.trim() || null : undefined

              if (typeof name !== "string" || typeof level !== "string" || !isLevel(level)) return
              if (!Number.isInteger(gelombang) || gelombang < 1) return

              setCandidates(prev => prev.map(item => item.id === editingCandidate.id ? {
                ...item,
                name,
                level,
                gelombang,
                nim,
                academicYear: academicYear ?? item.academicYear,
                ...(originSchool !== undefined ? { originSchool } : {}),
              } : item))

              const res = await updateCandidate(editingCandidate.id, {
                name,
                level,
                gelombang,
                nim,
                academicYear,
                ...(level === "SD" && originSchool !== undefined ? { originSchool } : {}),
              })
              if (res.success) {
                toast.success("Data siswa berhasil diperbarui")
              } else {
                toast.error("Gagal menyimpan data siswa")
              }
              setEditingCandidate(null)
              router.refresh()
            }}
            className="space-y-4 p-6"
          >
            <div className="space-y-1.5">
              <label htmlFor="edit-name" className={labelCls}>Nama lengkap</label>
              <input
                id="edit-name"
                name="name"
                defaultValue={editingCandidate?.name}
                required
                className={cn(controlCls, "w-full px-3")}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-level" className={labelCls}>Jenjang</label>
              <select
                id="edit-level"
                name="level"
                defaultValue={editingCandidate?.level}
                className={cn(controlCls, "w-full cursor-pointer px-3")}
              >
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-gelombang" className={labelCls}>Gelombang</label>
              <select
                id="edit-gelombang"
                name="gelombang"
                defaultValue={editingCandidate?.gelombang ?? 1}
                className={cn(controlCls, "w-full cursor-pointer px-3")}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                  <option key={g} value={g}>
                    Gelombang {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-academicYear" className={labelCls}>Tahun Ajaran</label>
              <input
                id="edit-academicYear"
                name="academicYear"
                defaultValue={editingCandidate?.academicYear ?? "2027/2028"}
                placeholder="Contoh: 2027/2028"
                className={cn(controlCls, "w-full px-3")}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-nim" className={labelCls}>NIM</label>
              <input
                id="edit-nim"
                name="nim"
                inputMode="numeric"
                autoComplete="off"
                defaultValue={editingCandidate?.nim ?? ""}
                placeholder="Dipakai sebagai kata sandi PDF surat hasil"
                className={cn(controlCls, "w-full px-3")}
              />
            </div>

            {editingCandidate?.level === "SD" && (
              <div className="space-y-1.5">
                <label htmlFor="edit-origin" className={labelCls}>Asal sekolah (TK/PAUD)</label>
                <input
                  id="edit-origin"
                  name="originSchool"
                  maxLength={120}
                  autoComplete="off"
                  defaultValue={editingCandidate.originSchool ?? ""}
                  placeholder="Tampil di raport observasi SD; guru juga bisa mengisinya"
                  className={cn(controlCls, "w-full px-3")}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCandidate(null)}
                className="h-10 px-4"
              >
                Batal
              </Button>
              <Button type="submit" className="h-10 bg-emerald-600 px-4 text-white hover:bg-emerald-700">
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog
        open={!!selectedCandidate}
        onOpenChange={() => setSelectedCandidate(null)}
        className="max-w-sm shadow-xl"
      >
        <DialogHeader className={dialogHeaderCls}>
          <DialogTitle className={dialogTitleCls}>Akses Formulir Observasi</DialogTitle>
        </DialogHeader>
        <DialogContent className="p-0">
          <div className="flex flex-col items-center p-6">
            <div className="mb-5 flex w-full rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setRole("parent")}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                  role === "parent" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Orang Tua
              </button>
              {selectedCandidate?.level === "SMP" && (
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                    role === "student" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Calon Siswa
                </button>
              )}
            </div>

            <div className="mb-4 flex min-h-[232px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-4">
              {origin && (
                <QRCodeSVG
                  value={formLink(selectedCandidate?.id)}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              )}
            </div>

            <div className="mb-5 space-y-1.5 text-center">
              <div className="text-sm font-semibold text-slate-900">{selectedCandidate?.name}</div>
              <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                Link formulir {role === "student" ? "siswa" : "orang tua"}
              </span>
            </div>

            <Button
              className="h-10 w-full bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                navigator.clipboard.writeText(formLink(selectedCandidate?.id))
                setSelectedCandidate(null)
                setRole("parent") // Reset
              }}
            >
              Salin Link {role === "student" ? "Siswa" : "Orang Tua"}
            </Button>

            <p className="mt-3 text-center text-xs text-slate-500">
              Link ini digunakan oleh orang tua/siswa untuk mengisi data observasi.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Candidate Dialog */}
      <Dialog open={isAddingCandidate} onOpenChange={setIsAddingCandidate} className="max-w-md shadow-xl">
        <DialogHeader className={dialogHeaderCls}>
          <DialogTitle className={dialogTitleCls}>Tambah Siswa</DialogTitle>
        </DialogHeader>
        <DialogContent className="p-0">
          <form
            className="space-y-4 p-6"
            onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const name = formData.get("name") as string
              const level = formData.get("level") as string
              const room = level === "SMP" ? (formData.get("room") as string) : undefined
              const selectedInterviewer = formData.get("selectedInterviewer") as string

              if (name && level) {
                const gelombangRaw = Number(formData.get("gelombang"))
                const gelombang = Number.isInteger(gelombangRaw) && gelombangRaw >= 1 ? gelombangRaw : undefined
                const nim = String(formData.get("nim") ?? "").trim() || undefined
                const res = await addCandidate({ name, level, room, selectedInterviewer, gelombang, nim })
                if (res.success) {
                  setIsAddingCandidate(false)
                  router.refresh()
                } else {
                  alert(res.error)
                }
              }
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor="add-name" className={labelCls}>Nama lengkap siswa</label>
              <input
                id="add-name"
                name="name"
                required
                placeholder="Contoh: Abdullah Hakim"
                className={cn(controlCls, "w-full px-3")}
              />
            </div>

            {addUnit === "SMP" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="add-level" className={labelCls}>Unit sekolah</label>
                  <select
                    id="add-level"
                    name="level"
                    required
                    value={addUnit}
                    onChange={(e) => setAddUnit(e.target.value as "SD" | "SMP")}
                    className={cn(controlCls, "w-full cursor-pointer px-3")}
                  >
                    <option value="SD">Unit SD</option>
                    <option value="SMP">Unit SMP</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="add-room" className={labelCls}>Ruangan</label>
                  <select
                    id="add-room"
                    name="room"
                    required
                    className={cn(controlCls, "w-full cursor-pointer px-3")}
                  >
                    <option value="">Pilih ruangan...</option>
                    {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="add-level" className={labelCls}>Unit sekolah</label>
                <select
                  id="add-level"
                  name="level"
                  required
                  value={addUnit}
                  onChange={(e) => setAddUnit(e.target.value as "SD" | "SMP")}
                  className={cn(controlCls, "w-full cursor-pointer px-3")}
                >
                  <option value="SD">Unit SD</option>
                  <option value="SMP">Unit SMP</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="add-gelombang" className={labelCls}>Gelombang</label>
              <input
                id="add-gelombang"
                name="gelombang"
                type="number"
                min={1}
                max={9}
                placeholder="Otomatis (gelombang terbaru)"
                className={cn(controlCls, "w-full px-3")}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="add-nim" className={labelCls}>NIM</label>
              <input id="add-nim" name="nim" inputMode="numeric" autoComplete="off" placeholder="Opsional, bisa diisi nanti" className={cn(controlCls, "w-full px-3")} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="add-interviewer" className={labelCls}>
                {addUnit === "SD" ? "Observer SD" : "Pewawancara SMP"}
              </label>
              <select
                id="add-interviewer"
                name="selectedInterviewer"
                required={addUnit === "SMP"}
                defaultValue={addUnit === "SD" ? "Semua Observer SD" : ""}
                className={cn(controlCls, "w-full cursor-pointer px-3")}
              >
                {addUnit === "SD" ? (
                  <>
                    <option value="Semua Observer SD">Semua Observer SD (Otomatis)</option>
                    <option value="">Pilih observer tertentu...</option>
                  </>
                ) : (
                  <option value="">Pilih pewawancara...</option>
                )}
                {INTERVIEWERS.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              {addUnit === "SD" && (
                <p className="text-xs text-emerald-600">
                  ✓ Siswa SD otomatis muncul dan dapat diobservasi oleh semua guru observer SD.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingCandidate(false)}
                className="h-10 px-4"
              >
                Batal
              </Button>
              <Button type="submit" className="h-10 bg-emerald-600 px-4 text-white hover:bg-emerald-700">
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!targetDelete}
        onOpenChange={() => !isDeleting && setTargetDelete(null)}
        className="max-w-md shadow-xl"
      >
        <DialogContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Trash2 size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Hapus siswa?</DialogTitle>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Anda akan menghapus data <span className="font-semibold text-slate-900">{targetDelete?.name}</span> secara permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              className="h-10 px-4"
              onClick={() => setTargetDelete(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              className="h-10 bg-rose-600 px-4 text-white hover:bg-rose-700"
              disabled={isDeleting}
              onClick={async () => {
                if (!targetDelete) return
                setIsDeleting(true)
                const res = await deleteCandidate(targetDelete.id)
                setIsDeleting(false)
                if (res.success) {
                  setCandidates(prev => prev.filter(c => c.id !== targetDelete.id))
                  setTargetDelete(null)
                  toast.success("Siswa berhasil dihapus")
                } else {
                  toast.error(res.error || "Gagal menghapus")
                }
              }}
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={!!targetReset}
        onOpenChange={() => !isResetting && setTargetReset(null)}
        className="max-w-md shadow-xl"
      >
        <DialogContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <RefreshCw size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Reset status?</DialogTitle>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Kembalikan status <span className="font-semibold text-slate-900">{targetReset?.name}</span> ke 'Pending' agar bisa mengisi formulir kembali?
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              className="h-10 px-4"
              onClick={() => setTargetReset(null)}
              disabled={isResetting}
            >
              Batal
            </Button>
            <Button
              className="h-10 bg-emerald-600 px-4 text-white hover:bg-emerald-700"
              disabled={isResetting}
              onClick={async () => {
                if (!targetReset) return
                setIsResetting(true)
                const res = await updateCandidateStatus(targetReset.id, "PENDING")
                setIsResetting(false)
                if (res.success) {
                  setTargetReset(null)
                  router.refresh()
                  toast.success("Status berhasil di-reset")
                } else {
                  toast.error("Gagal me-reset status")
                }
              }}
            >
              {isResetting ? "Memproses..." : "Ya, Reset"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
