"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Search,
  Plus,
  Download,
  Filter,
  Trash2,
  QrCode,
  ArrowRight,
  Edit,
  RefreshCw
} from "lucide-react"
import { formatDate, cn } from "@/lib/utils"
import { ITEMS_PER_PAGE, INTERVIEWERS, ROOMS } from "@/lib/constants"
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { QRCodeSVG } from "qrcode.react"
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
  academicTestResult?: {
    totalScore: number
    subjectScores: string
  } | null
}

interface Props {
  candidates: Candidate[]
}

const thStyle = "px-4 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.05em] text-center whitespace-nowrap border-b border-[#E2E8F0]"
const tdCenterStyle = "px-4 py-3.5 text-[13px] text-[#475569] text-center whitespace-nowrap border-b border-[#F1F5F9]"

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "RESPONSE_RECEIVED":
      return <Badge variant="success">Formulir Masuk</Badge>
    case "PENDING":
      return <Badge variant="muted">Belum Ada Formulir</Badge>
    case "REVIEWED":
      return <Badge variant="info">Selesai</Badge>
    default:
      return <Badge variant="warning">Menunggu</Badge>
  }
}

export default function AdminCandidatesClient({ candidates: initialCandidates }: Props) {
  const router = useRouter()
  const [candidates, setCandidates] = useState(initialCandidates)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null)
  const [isAddingCandidate, setIsAddingCandidate] = useState(false)
  const [statusFilter, setStatusFilter] = useState("Semua Status")
  const [levelFilter, setLevelFilter] = useState("Semua Jenjang")
  const [origin, setOrigin] = useState("")
  const [role, setRole] = useState("parent")
  const [targetDelete, setTargetDelete] = useState<Candidate | null>(null)
  const [targetReset, setTargetReset] = useState<Candidate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [downloadingZip, setDownloadingZip] = useState(false)

  const getPasswordForCandidate = (c: any) => {
    if (c.parentPhone) {
      const cleaned = c.parentPhone.replace(/[^0-9]/g, "")
      if (cleaned.length >= 6) return cleaned
    }
    const cleanedName = c.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6)
    return `${cleanedName}123`
  }

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
          toast.success(`${res.count} siswa berhasil diimpor!`)
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
    const interval = setInterval(poll, 10000) // Poll every 10s
    return () => {
      clearInterval(interval)
      abortController?.abort()
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "Semua Status" || 
        (statusFilter === "Formulir Masuk" && c.status === "RESPONSE_RECEIVED") ||
        (statusFilter === "Belum Ada" && c.status === "PENDING") ||
        (statusFilter === "Selesai" && c.status === "REVIEWED")
      const matchesLevel = levelFilter === "Semua Jenjang" || c.level === levelFilter
      
      return matchesSearch && matchesStatus && matchesLevel
    })
  }, [candidates, search, statusFilter, levelFilter])

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
        "Password PDF": getPasswordForCandidate(c)
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

    XLSX.writeFile(workbook, `Hasil_Observasi_Akademik_Gelombang_2_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success("Excel berhasil diunduh!")
  }

  const downloadAllPDFsAsZip = async () => {
    const candidatesWithTest = filtered.filter(c => c.academicTestResult)
    const totalFiltered = filtered.length
    const withoutTest = totalFiltered - candidatesWithTest.length

    if (candidatesWithTest.length === 0) {
      toast.error(
        `Belum ada siswa yang sudah ujian akademik dari ${totalFiltered} siswa yang tampil. ` +
        `Pastikan siswa sudah mengerjakan tes terlebih dahulu.`,
        { duration: 5000 }
      )
      return
    }

    if (withoutTest > 0) {
      toast(`Mengunduh ${candidatesWithTest.length} siswa yang sudah ujian. ${withoutTest} siswa belum ujian akan dilewati.`, {
        icon: "ℹ️",
        duration: 4000,
      })
    }

    setDownloadingZip(true)
    const toastId = toast.loading(`Menyiapkan ${candidatesWithTest.length} file PDF...`)
    
    try {
      const { jsPDF } = await import("jspdf")
      const { default: JSZip } = await import("jszip")
      
      const zip = new JSZip()
      
      const primaryColor = [4, 120, 87] 
      const secondaryColor = [30, 41, 59]

      for (let i = 0; i < candidatesWithTest.length; i++) {
        const c = candidatesWithTest[i]
        const result = c.academicTestResult!
        
        toast.loading(`Membuat PDF ${i + 1}/${candidatesWithTest.length}: ${c.name}...`, { id: toastId })

        const doc = new jsPDF()


        // Top border/banner
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.rect(0, 0, 210, 8, "F")
        
        // Header
        doc.setFont("helvetica", "bold")
        doc.setFontSize(18)
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.text("AL FAKHIR ISLAMIC SCHOOL", 20, 22)
        
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(100, 116, 139)
        doc.text("Jl. Raya Al Fakhir No. 1, Observasi Akademik Gelombang 2", 20, 27)
        
        doc.setFont("helvetica", "bold")
        doc.setFontSize(12)
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
        doc.text("LAPORAN HASIL OBSERVASI AKADEMIK (GELOMBANG 2)", 20, 38)
        
        // Draw line
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.5)
        doc.line(20, 42, 190, 42)
        
        // Student Info
        doc.setFontSize(9)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(100, 116, 139)
        doc.text("DATA CALON SISWA", 20, 50)
        
        doc.setFont("helvetica", "normal")
        doc.setTextColor(30, 41, 59)
        
        const infoY = 56
        doc.setFont("helvetica", "bold")
        doc.text("Nama Calon Siswa", 20, infoY)
        doc.text("Jenjang", 20, infoY + 6)
        doc.text("Ruangan Ujian", 20, infoY + 12)
        
        doc.setFont("helvetica", "normal")
        doc.text(`:  ${c.correctedName || c.name}`, 55, infoY)
        doc.text(`:  ${c.level} (SMP)`, 55, infoY + 6)
        doc.text(`:  ${c.room || "-"}`, 55, infoY + 12)
        
        doc.setFont("helvetica", "bold")
        doc.text("Tanggal Observasi", 115, infoY)
        doc.text("Status", 115, infoY + 6)
        doc.text("Pewawancara", 115, infoY + 12)
        
        doc.setFont("helvetica", "normal")
        doc.text(`:  ${new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`, 145, infoY)
        doc.text(`:  SELESAI`, 145, infoY + 6)
        doc.text(`:  ${c.selectedInterviewer || "Tim Observasi"}`, 145, infoY + 12)
        
        // Draw line
        doc.line(20, 76, 190, 76)
        
        // Subject Scores Table Header
        doc.setFont("helvetica", "bold")
        doc.setTextColor(100, 116, 139)
        doc.text("HASIL PER MATA PELAJARAN (SUBJECT PERFORMANCE)", 20, 84)
        
        const tableHeaderY = 90
        doc.setFillColor(248, 250, 252) 
        doc.rect(20, tableHeaderY, 170, 8, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.setTextColor(71, 85, 105)
        
        doc.text("MATA PELAJARAN", 25, tableHeaderY + 5.5)
        doc.text("SOAL", 95, tableHeaderY + 5.5)
        doc.text("BENAR", 115, tableHeaderY + 5.5)
        doc.text("NILAI", 135, tableHeaderY + 5.5)
        doc.text("PREDIKAT", 160, tableHeaderY + 5.5)
        
        // Parse subject scores
        let bIndo = { correct: 0, total: 5 }
        let mat = { correct: 0, total: 5 }
        let bIng = { correct: 0, total: 5 }
        let agama = { correct: 0, total: 5 }
        let ipa = { correct: 0, total: 5 }
        
        if (result.subjectScores) {
          try {
            const parsed = JSON.parse(result.subjectScores)
            if (parsed["Bahasa Indonesia"]) bIndo = parsed["Bahasa Indonesia"]
            if (parsed["Matematika"]) mat = parsed["Matematika"]
            if (parsed["Bahasa Inggris"]) bIng = parsed["Bahasa Inggris"]
            if (parsed["Agama Islam"]) agama = parsed["Agama Islam"]
            if (parsed["IPA"]) ipa = parsed["IPA"]
          } catch (e) {
            console.error(e)
          }
        }
        
        const getSubjectPredicateLocal = (score: number) => {
          if (score >= 86) return { grade: "A", desc: "Sangat Baik" }
          if (score >= 71) return { grade: "B", desc: "Baik" }
          if (score >= 56) return { grade: "C", desc: "Cukup" }
          return { grade: "D", desc: "Kurang" }
        }

        const subjects = [
          { name: "Bahasa Indonesia", ...bIndo },
          { name: "Matematika", ...mat },
          { name: "Bahasa Inggris", ...bIng },
          { name: "Agama Islam", ...agama },
          { name: "IPA", ...ipa }
        ]
        
        let currentY = tableHeaderY + 8
        doc.setFont("helvetica", "normal")
        doc.setTextColor(30, 41, 59)
        
        subjects.forEach((subj, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(254, 254, 254)
          } else {
            doc.setFillColor(241, 245, 249)
          }
          doc.rect(20, currentY, 170, 8, "F")
          
          const score = (subj.correct / subj.total) * 100
          const pred = getSubjectPredicateLocal(score)
          
          doc.text(subj.name, 25, currentY + 5.5)
          doc.text(subj.total.toString(), 95, currentY + 5.5)
          doc.text(subj.correct.toString(), 115, currentY + 5.5)
          doc.setFont("helvetica", "bold")
          doc.text(score.toFixed(0), 135, currentY + 5.5)
          doc.text(`${pred.grade} (${pred.desc})`, 160, currentY + 5.5)
          doc.setFont("helvetica", "normal")
          
          currentY += 8
        })
        
        // Total Summary Row
        doc.setFillColor(236, 253, 245) 
        doc.rect(20, currentY, 170, 10, "F")
        doc.setFont("helvetica", "bold")
        doc.setTextColor(4, 120, 87)
        
        doc.text("TOTAL SKOR AKHIR", 25, currentY + 6.5)
        doc.setFontSize(12)
        doc.text(result.totalScore.toFixed(0), 135, currentY + 7)
        
        const overallPred = getSubjectPredicateLocal(result.totalScore)
        doc.setFontSize(9)
        doc.text(`${overallPred.grade} - ${overallPred.desc}`, 160, currentY + 6.5)
        
        // Footer / Signatures
        doc.setFont("helvetica", "normal")
        doc.setTextColor(71, 85, 105)
        
        const footerY = currentY + 30
        doc.text("Tangerang Selatan, " + new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }), 135, footerY)
        doc.text("Pewawancara / Assessor,", 135, footerY + 6)
        
        doc.setFont("helvetica", "bold")
        doc.setTextColor(30, 41, 59)
        doc.text(c.selectedInterviewer || "Tim Observasi Al Fakhir", 135, footerY + 28)
        
        doc.setFont("helvetica", "normal")
        doc.setTextColor(148, 163, 184)
        doc.setFontSize(7)
        doc.text("* Dokumen ini dihasilkan secara otomatis oleh Sistem Observasi Al Fakhir.", 20, 275)
        doc.text("Halaman 1 dari 1", 175, 275)
        
        const pdfArrayBuffer = doc.output("arraybuffer")
        const safeCandidateName = c.name.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_")
        zip.file(`Hasil_Observasi_Akademik_${safeCandidateName}.pdf`, pdfArrayBuffer)

      }

      toast.loading("Mengompres file ZIP...", { id: toastId })
      const content = await zip.generateAsync({ type: "blob" })
      
      const zipFileName = `Hasil_Observasi_Akademik_Gelombang_2_${new Date().toISOString().split('T')[0]}.zip`
      const zipBlob = new Blob([await content.arrayBuffer()], { type: "application/octet-stream" })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement("a")
      link.style.display = "none"
      link.href = url
      link.download = zipFileName
      document.body.appendChild(link)
      link.click()
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 1500)

      toast.success("Semua PDF berhasil diunduh dalam file ZIP!", { id: toastId })

    } catch (err) {
      console.error(err)
      toast.error("Gagal mengunduh semua PDF.", { id: toastId })
    } finally {
      setDownloadingZip(false)
    }
  }

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div className="animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="mb-6 space-y-4">
        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[22px] font-bold text-[#0F172A] m-0 italic uppercase tracking-tight">Daftar Seluruh Siswa</h2>
            <p className="text-[13px] text-[#94A3B8] m-0 mt-1 font-medium">Monitoring data real-time untuk Unit SD &amp; SMP</p>
          </div>
          <Button 
            onClick={() => setIsAddingCandidate(true)}
            className="h-11 bg-slate-900 hover:bg-black text-white rounded-xl px-6 text-[13px] font-bold shadow-lg shadow-slate-900/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Tambah Siswa Baru
          </Button>
        </div>

        {/* Action Bar */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl px-4 py-3 shadow-sm flex flex-wrap items-center gap-2">
          {/* Import */}
          <input 
            type="file" 
            id="excel-upload" 
            className="hidden" 
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
          />
          <Button 
            variant="outline" 
            onClick={() => document.getElementById('excel-upload')?.click()}
            disabled={isImporting}
            className="h-9 border-slate-200 text-slate-600 rounded-lg px-3 text-[12px] font-semibold hover:bg-slate-50 transition-all flex items-center gap-1.5"
          >
            {isImporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
            Import Excel
          </Button>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 mx-1" />

          {/* Export group */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={exportToExcel}
              className="h-9 border-emerald-100 bg-emerald-50/30 text-emerald-700 hover:bg-emerald-50 rounded-lg px-3 text-[12px] font-semibold transition-all flex items-center gap-1.5"
            >
              <Download size={13} />
              Ekspor Data (.xlsx)
            </Button>
            <Button 
              variant="outline" 
              onClick={exportNilaiToExcel}
              className="h-9 border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 rounded-lg px-3 text-[12px] font-semibold transition-all flex items-center gap-1.5"
            >
              <Download size={13} />
              Unduh Nilai (A/B/C/D)
            </Button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 mx-1" />

          {/* PDF group */}
          <Button 
            variant="outline" 
            onClick={downloadAllPDFsAsZip}
            disabled={downloadingZip}
            className="h-9 border-indigo-100 bg-indigo-50/20 text-indigo-700 hover:bg-indigo-50 rounded-lg px-3 text-[12px] font-semibold transition-all flex items-center gap-1.5"
          >
            {downloadingZip ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
            Unduh Semua PDF (.zip)
          </Button>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            placeholder="Cari nama siswa..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full h-10 border border-[#E2E8F0] rounded-xl pl-10 pr-3.5 text-[13px] text-[#0F172A] outline-none bg-[#F8FAFC] focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="h-10 border border-[#E2E8F0] rounded-xl px-3 text-[13px] font-bold text-[#475569] bg-[#F8FAFC] cursor-pointer outline-none hover:border-[#CBD5E1] transition-all min-w-[150px]"
        >
          <option>Semua Status</option>
          <option>Formulir Masuk</option>
          <option>Belum Ada</option>
          <option>Selesai</option>
        </select>
        <select 
          value={levelFilter}
          onChange={(e) => { setLevelFilter(e.target.value); setPage(1) }}
          className="h-10 border border-[#E2E8F0] rounded-xl px-3 text-[13px] font-bold text-[#475569] bg-[#F8FAFC] cursor-pointer outline-none hover:border-[#CBD5E1] transition-all min-w-[150px]"
        >
          <option>Semua Jenjang</option>
          <option>SD</option>
          <option>SMP</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-[#E2E8F0] rounded-[32px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className={cn(thStyle, "w-12")}>#</th>
                <th className={cn(thStyle, "text-left")}>Nama Siswa</th>
                <th className={cn(thStyle, "w-24")}>Jenjang</th>
                <th className={cn(thStyle, "w-32")}>Ruangan</th>
                <th className={cn(thStyle, "w-48")}>Pewawancara</th>
                <th className={cn(thStyle, "w-36")}>Status</th>
                <th className={cn(thStyle, "w-32")}>Skor Akad.</th>
                <th className={cn(thStyle, "w-40")}>Tanggal</th>
                <th className={cn(thStyle, "w-32")}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-24 text-center text-[#94A3B8]">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                      <Search size={40} className="text-slate-200" />
                    </div>
                    <div className="text-[15px] font-bold text-[#475569] mb-1">Tidak ada data siswa ditemukan</div>
                    <div className="text-[13px]">Coba ubah filter atau tambah data siswa baru</div>
                  </td>
                </tr>
              ) : (
                paginated.map((c, i) => (
                  <tr 
                    key={c.id} 
                    className={cn(
                      "transition-all duration-300 group border-b border-[#F1F5F9]",
                      c.level === "SD" ? "hover:bg-blue-50/30" : "hover:bg-purple-50/30"
                    )}
                  >
                    <td className={tdCenterStyle}>{(page - 1) * ITEMS_PER_PAGE + i + 1}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-[13px] text-[#0F172A] group-hover:text-primary transition-colors">
                        {c.correctedName || c.name}
                      </div>
                      <div className="text-[11px] text-[#94A3B8] mt-0.5 font-black uppercase tracking-widest">
                        {c.parentPhone ? (
                          <span className="text-emerald-600">📱 {c.parentPhone}</span>
                        ) : (
                          "Belum Ada No. HP"
                        )}
                      </div>
                    </td>
                    <td className={tdCenterStyle}>
                      <select 
                        defaultValue={c.level}
                        onChange={async (e) => {
                          await updateCandidate(c.id, { level: e.target.value as any })
                        }}
                        className={cn(
                          "w-full bg-slate-50 border border-[#E2E8F0] rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-primary transition-all cursor-pointer",
                          c.level === "SD" ? "text-sd" : "text-smp"
                        )}
                      >
                        <option value="SD">SD</option>
                        <option value="SMP">SMP</option>
                      </select>
                    </td>
                    <td className={tdCenterStyle}>
                      <select 
                        defaultValue={c.room || ""}
                        onChange={async (e) => {
                          await updateCandidateRoom(c.id, e.target.value)
                        }}
                        className="w-full bg-slate-50 border border-[#E2E8F0] rounded-lg px-1 py-1 text-[11px] font-bold text-[#475569] outline-none focus:border-primary transition-all"
                      >
                        <option value="">-</option>
                        {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className={tdCenterStyle}>
                      <select 
                        defaultValue={c.selectedInterviewer || ""}
                        onChange={async (e) => {
                          await updateCandidateInterviewer(c.id, e.target.value)
                        }}
                        className="w-full bg-slate-50 border border-[#E2E8F0] rounded-lg px-2 py-1 text-[11px] font-bold text-[#475569] outline-none focus:border-primary transition-all"
                      >
                        <option value="">Pilih...</option>
                        {INTERVIEWERS.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                    </td>
                    <td className={tdCenterStyle}>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className={tdCenterStyle}>
                      {c.level === "SMP" ? (
                        c.academicTestResult ? (
                          <div className="flex flex-col items-center">
                            <span className="font-black text-primary text-[14px] italic">{c.academicTestResult.totalScore.toFixed(0)}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Teruji</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-bold italic uppercase">Belum Ujian</span>
                        )
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className={cn(tdCenterStyle, "text-[12px] text-[#94A3B8]")}>
                      {formatDate(c.createdAt)}
                    </td>
                    <td className={tdCenterStyle}>
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => setEditingCandidate(c)}
                          className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-center text-[#94A3B8] hover:text-primary transition-all"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => setSelectedCandidate(c)}
                          className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-center text-[#94A3B8] hover:text-primary transition-all"
                          title="QR Code"
                        >
                          <QrCode size={14} />
                        </button>
                        <button 
                          onClick={() => setTargetReset(c)}
                          className="w-8 h-8 rounded-lg border border-amber-100 bg-white flex items-center justify-center text-amber-500 hover:bg-amber-50 transition-all"
                          title="Reset Status"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button 
                          onClick={() => setTargetDelete(c)}
                          className="w-8 h-8 rounded-lg border border-[#FEE2E2] bg-white flex items-center justify-center text-[#EF4444] hover:bg-[#FEE2E2] transition-all"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-8 py-6 bg-white border-t border-[#F1F5F9]">
            <div className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider italic">
              Menampilkan {(page - 1) * ITEMS_PER_PAGE + 1} - {Math.min(page * ITEMS_PER_PAGE, filtered.length)} dari {filtered.length} Siswa
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-10 px-6 rounded-2xl border-slate-200 text-[#475569] font-black uppercase tracking-tight italic hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95"
              >
                Sebelumnya
              </Button>
              <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[13px] font-black text-slate-900 italic">
                {page}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-10 px-6 rounded-2xl border-slate-200 text-[#475569] font-black uppercase tracking-tight italic hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Edit Candidate Dialog */}
      <Dialog open={!!editingCandidate} onOpenChange={() => setEditingCandidate(null)}>
        <DialogContent className="max-w-md rounded-3xl p-0 bg-white overflow-hidden border-none shadow-2xl">
          <DialogHeader className="px-8 pt-8 pb-4 bg-slate-50/50">
            <DialogTitle className="text-[18px] font-black text-[#0F172A] uppercase tracking-tight">
              Edit Data Siswa
            </DialogTitle>
          </DialogHeader>
          
          <form 
            onSubmit={async (e) => {
              e.preventDefault()
              if (!editingCandidate) return
              const formData = new FormData(e.currentTarget)
              const name = formData.get("name") as string
              const level = formData.get("level") as any
              
              await updateCandidate(editingCandidate.id, { name, level })
              setEditingCandidate(null)
              router.refresh()
            }}
            className="p-8 space-y-5"
          >
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</label>
              <input 
                name="name"
                defaultValue={editingCandidate?.name}
                required
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-[14px] outline-none focus:border-primary transition-all bg-slate-50/50 font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Jenjang</label>
              <select 
                name="level"
                defaultValue={editingCandidate?.level}
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-[14px] outline-none focus:border-primary transition-all bg-slate-50/50 font-bold"
              >
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button"
                variant="outline"
                onClick={() => setEditingCandidate(null)}
                className="flex-1 h-12 rounded-xl border-slate-200 text-slate-500 font-bold"
              >
                Batal
              </Button>
              <Button 
                type="submit"
                className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg"
              >
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="max-w-xs rounded-2xl p-8 bg-white overflow-hidden relative">
          <DialogTitle className="text-center text-[18px] font-bold text-[#0F172A] mb-6">
            Akses Formulir Observasi
          </DialogTitle>
          
          <div className="flex flex-col items-center">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 w-full">
              <button 
                onClick={() => setRole("parent")}
                className={cn(
                  "flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                  role === "parent" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                )}
              >
                Orang Tua
              </button>
              {selectedCandidate?.level === "SMP" && (
                <button 
                  onClick={() => setRole("student")}
                  className={cn(
                    "flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                    role === "student" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                  )}
                >
                  Calon Siswa
                </button>
              )}
            </div>

            <div className="bg-white p-4 rounded-3xl border-4 border-[#F1F5F9] shadow-xl mb-6 min-h-[200px] flex items-center justify-center">
              {origin && (
                <QRCodeSVG 
                  value={`https://dashboard-alfakhir.vercel.app/form/${selectedCandidate?.id}${role === "student" ? "?role=student" : ""}`} 
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              )}
            </div>
            
            <div className="text-center space-y-2 mb-8">
              <div className="text-[15px] font-bold text-[#0F172A] uppercase tracking-tight">
                {selectedCandidate?.name}
              </div>
              <div className="px-3 py-1 bg-[#F1F5F9] text-[#64748B] text-[11px] font-black rounded-full inline-block uppercase tracking-widest">
                LINK FORM {role === "student" ? "SISWA" : "ORANG TUA"}
              </div>
            </div>

            <Button 
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold h-12 rounded-xl shadow-lg shadow-emerald-500/20"
              onClick={() => {
                const url = `https://dashboard-alfakhir.vercel.app/form/${selectedCandidate?.id}${role === "student" ? "?role=student" : ""}`;
                navigator.clipboard.writeText(url);
                setSelectedCandidate(null);
                setRole("parent"); // Reset
              }}
            >
              Salin Link {role === "student" ? "Siswa" : "Orang Tua"}
            </Button>
            
            <p className="mt-4 text-[11px] text-[#94A3B8] font-medium">
              Link ini digunakan oleh orang tua/siswa untuk mengisi data observasi.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Candidate Dialog */}
      <Dialog open={isAddingCandidate} onOpenChange={setIsAddingCandidate}>
        <DialogContent className="max-w-md rounded-[32px] p-0 bg-white overflow-hidden border-none shadow-2xl">
          <DialogHeader className="px-10 pt-10 pb-6 bg-slate-50/50">
            <DialogTitle className="text-[24px] font-black text-[#0F172A] uppercase tracking-tighter italic">
              Tambah Siswa Baru
            </DialogTitle>
          </DialogHeader>
          
          <form className="p-10 space-y-6" onSubmit={async (e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const name = formData.get("name") as string
            const level = formData.get("level") as string
            const room = formData.get("room") as string
            const selectedInterviewer = formData.get("selectedInterviewer") as string
            
            if (name && level) {
              const res = await addCandidate({ name, level, room, selectedInterviewer })
              if (res.success) {
                setIsAddingCandidate(false)
                router.refresh()
              } else {
                alert(res.error)
              }
            }
          }}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nama Lengkap Siswa</label>
              <input 
                name="name"
                required
                placeholder="Contoh: Abdullah Hakim..."
                className="w-full h-14 border-2 border-slate-100 rounded-2xl px-5 text-[15px] font-bold outline-none focus:border-primary transition-all bg-slate-50/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Unit Sekolah</label>
                <select 
                  name="level"
                  required
                  className="w-full h-14 border-2 border-slate-100 rounded-2xl px-4 text-[15px] font-bold outline-none focus:border-primary transition-all bg-slate-50/30 cursor-pointer"
                >
                  <option value="SD">Unit SD</option>
                  <option value="SMP">Unit SMP</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Ruangan</label>
                <select 
                  name="room"
                  required
                  className="w-full h-14 border-2 border-slate-100 rounded-2xl px-4 text-[15px] font-bold outline-none focus:border-primary transition-all bg-slate-50/30 cursor-pointer"
                >
                  <option value="">Pilih...</option>
                  {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pewawancara Terpilih</label>
              <select 
                name="selectedInterviewer"
                required
                className="w-full h-14 border-2 border-slate-100 rounded-2xl px-4 text-[15px] font-bold outline-none focus:border-primary transition-all bg-slate-50/30 cursor-pointer"
              >
                <option value="">Pilih Pewawancara...</option>
                {INTERVIEWERS.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            <div className="pt-6 flex gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddingCandidate(false)}
                className="flex-1 h-14 rounded-2xl border-slate-200 font-black text-slate-400 uppercase tracking-widest text-[12px]"
              >
                Batal
              </Button>
              <Button 
                type="submit"
                className="flex-1 h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[12px] shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-1"
              >
                Simpan Data
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!targetDelete} onOpenChange={() => !isDeleting && setTargetDelete(null)}>
        <DialogContent className="max-w-md rounded-[32px] p-10 bg-white border-none shadow-2xl text-center">
          <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-500">
            <Trash2 size={40} />
          </div>
          <h2 className="text-[24px] font-black text-[#0F172A] uppercase tracking-tighter italic mb-3">Hapus Siswa?</h2>
          <p className="text-slate-500 text-[15px] font-medium leading-relaxed mb-10">
            Anda akan menghapus data <span className="font-bold text-slate-900">{targetDelete?.name}</span> secara permanen. Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-12 rounded-2xl font-bold border-slate-200 text-slate-500 hover:bg-slate-50"
              onClick={() => setTargetDelete(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button 
              className="h-12 rounded-2xl font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20"
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
      <Dialog open={!!targetReset} onOpenChange={() => !isResetting && setTargetReset(null)}>
        <DialogContent className="max-w-md rounded-[32px] p-10 bg-white border-none shadow-2xl text-center">
          <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-500">
            <RefreshCw size={40} />
          </div>
          <h2 className="text-[24px] font-black text-[#0F172A] uppercase tracking-tighter italic mb-3">Reset Status?</h2>
          <p className="text-slate-500 text-[15px] font-medium leading-relaxed mb-10">
            Kembalikan status <span className="font-bold text-slate-900">{targetReset?.name}</span> ke 'Pending' agar bisa mengisi formulir kembali?
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-12 rounded-2xl font-bold border-slate-200 text-slate-500 hover:bg-slate-50"
              onClick={() => setTargetReset(null)}
              disabled={isResetting}
            >
              Batal
            </Button>
            <Button 
              className="h-12 rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
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
