"use client"

import { useState, useEffect } from "react"
import * as XLSX from "xlsx"

import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Candidate, InterviewerNote } from "@prisma/client"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/input"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog"
import { SkeletonSummary } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  Sparkles,
  Lock,
  RefreshCw,
  Send,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  GraduationCap,
  History,
  QrCode,
  Download
} from "lucide-react"
import { formatDate } from "@/lib/utils"

interface Props {
  candidate: any
  existingNote: InterviewerNote | null
  savedSummary: string | null
}

const RECOMMENDATION_OPTIONS = [
  { value: "Terima", label: "✅ Terima", color: "success" },
  { value: "Pertimbangkan", label: "⚠️ Pertimbangkan", color: "warning" },
  { value: "Tolak", label: "❌ Tolak", color: "danger" },
] as const

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
}: Props) {
  const router = useRouter()

  // Notes form state
  const [observation, setObservation] = useState(existingNote?.observation || "")
  const [academicAssessment, setAcademicAssessment] = useState(existingNote?.academicAssessment || "")
  const [familySupport, setFamilySupport] = useState(existingNote?.familySupport || "")
  const [characterNotes, setCharacterNotes] = useState(existingNote?.characterNotes || "")
  const [otherNotes, setOtherNotes] = useState(existingNote?.otherNotes || "")
  const [interviewerNameInput, setInterviewerNameInput] = useState(
    existingNote?.interviewerName || (candidate as any).selectedInterviewer || ""
  )
  const [recommendation, setRecommendation] = useState<"Terima" | "Pertimbangkan" | "Tolak" | "">(
    (existingNote?.recommendation as any) || ""
  )
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showAcademicDetails, setShowAcademicDetails] = useState(false)
  const [showQrDialog, setShowQrDialog] = useState(false)

  // AI summary state
  const [summary, setSummary] = useState<string | null>(savedSummary)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const [downloadingPDF, setDownloadingPDF] = useState(false)


  const getSubjectPredicate = (score: number) => {
    if (score >= 86) return { grade: "A", desc: "Sangat Baik" }
    if (score >= 71) return { grade: "B", desc: "Baik" }
    if (score >= 56) return { grade: "C", desc: "Cukup" }
    return { grade: "D", desc: "Kurang" }
  }

  const getPasswordForCandidate = (c: any) => {
    if (c.parentPhone) {
      const cleaned = c.parentPhone.replace(/[^0-9]/g, "")
      if (cleaned.length >= 6) return cleaned
    }
    const cleanedName = c.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6)
    return `${cleanedName}123`
  }

  const downloadAsExcel = () => {
    if (!candidate.academicTestResult) {
      toast.error("Data observasi akademik belum ada.")
      return
    }

    const result = candidate.academicTestResult
    const totalScore = result.totalScore
    const { grade, desc } = getSubjectPredicate(totalScore)

    // Parse per-subject scores
    let subjects: { name: string; score: number; correct: number; total: number; grade: string; desc: string }[] = []
    if (result.subjectScores) {
      try {
        const parsed = JSON.parse(result.subjectScores)
        subjects = Object.entries(parsed).map(([name, data]: [string, any]) => {
          const score = Math.round((data.correct / data.total) * 100)
          const pred = getSubjectPredicate(score)
          return { name, score, correct: data.correct, total: data.total, grade: pred.grade, desc: pred.desc }
        })
      } catch (e) { /* ignore */ }
    }

    // Sheet 1: Ringkasan
    const summary = [{
      "Nama Siswa": candidate.correctedName || candidate.name,
      "Jenjang": candidate.level,
      "Ruangan": candidate.room || "-",
      "Pewawancara": candidate.selectedInterviewer || "-",
      "Nilai Akhir": Math.round(totalScore),
      "Predikat": grade,
      "Keterangan": desc,
    }]

    // Sheet 2: Per mapel
    const detail = subjects.map((s, idx) => ({
      "No": idx + 1,
      "Mata Pelajaran": s.name,
      "Jumlah Soal": s.total,
      "Jawaban Benar": s.correct,
      "Nilai": s.score,
      "Predikat": s.grade,
      "Keterangan": s.desc,
    }))

    // Sheet 3: Skala nilai
    const skala = [
      { "Rentang Nilai": "86 – 100", "Predikat": "A", "Keterangan": "Sangat Baik" },
      { "Rentang Nilai": "71 – 85",  "Predikat": "B", "Keterangan": "Baik" },
      { "Rentang Nilai": "56 – 70",  "Predikat": "C", "Keterangan": "Cukup" },
      { "Rentang Nilai": "< 56",      "Predikat": "D", "Keterangan": "Kurang" },
    ]

    const wb = XLSX.utils.book_new()

    const ws1 = XLSX.utils.json_to_sheet(summary)
    ws1["!cols"] = Object.keys(summary[0]).map(k => ({ wch: Math.max(k.length, String((summary[0] as any)[k] ?? "").length) + 4 }))
    XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan")

    const ws2 = XLSX.utils.json_to_sheet(detail)
    ws2["!cols"] = [{ wch: 6 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 10 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws2, "Nilai Per Mapel")

    const ws3 = XLSX.utils.json_to_sheet(skala)
    ws3["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws3, "Skala Predikat")

    const safeName = (candidate.correctedName || candidate.name)
      .replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_")
    XLSX.writeFile(wb, `Nilai_Observasi_${safeName}.xlsx`)
    toast.success("Excel berhasil diunduh!")
  }

  const downloadAcademicPDF = async () => {
    if (!candidate.academicTestResult) {
      toast.error("Data observasi akademik belum ada.")
      return
    }
    
    setDownloadingPDF(true)
    try {
      const { jsPDF } = await import("jspdf")
      const doc = new jsPDF()
      const result = candidate.academicTestResult
      
      const primaryColor = [4, 120, 87] 
      const secondaryColor = [30, 41, 59] 
      
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
      doc.text(`:  ${candidate.correctedName || candidate.name}`, 55, infoY)
      doc.text(`:  ${candidate.level} (SMP)`, 55, infoY + 6)
      doc.text(`:  ${candidate.room || "-"}`, 55, infoY + 12)
      
      doc.setFont("helvetica", "bold")
      doc.text("Tanggal Observasi", 115, infoY)
      doc.text("Status", 115, infoY + 6)
      doc.text("Pewawancara", 115, infoY + 12)
      
      doc.setFont("helvetica", "normal")
      doc.text(`:  ${formatDate(result.createdAt)}`, 145, infoY)
      doc.text(`:  SELESAI`, 145, infoY + 6)
      doc.text(`:  ${candidate.selectedInterviewer || "Tim Observasi"}`, 145, infoY + 12)
      
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
        const pred = getSubjectPredicate(score)
        
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
      
      const overallPred = getSubjectPredicate(result.totalScore)
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
      doc.text(candidate.selectedInterviewer || "Tim Observasi Al Fakhir", 135, footerY + 28)
      
      doc.setFont("helvetica", "normal")
      doc.setTextColor(148, 163, 184)
      doc.setFontSize(7)
      doc.text("* Dokumen ini dihasilkan secara otomatis oleh Sistem Observasi Al Fakhir.", 20, 275)
      doc.text("Halaman 1 dari 1", 175, 275)
      
      // Force download with proper filename (octet-stream bypasses Chrome PDF viewer)
      const safeName = (candidate.correctedName || candidate.name)
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .replace(/\s+/g, "_")
      const fileName = `Hasil_Observasi_Akademik_${safeName}.pdf`

      const pdfArrayBuffer = doc.output("arraybuffer")
      const downloadBlob = new Blob([pdfArrayBuffer], { type: "application/octet-stream" })
      const url = URL.createObjectURL(downloadBlob)
      const link = document.createElement("a")
      link.style.display = "none"
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 1500)

      toast.success("PDF berhasil diunduh!", { duration: 4000 })


    } catch (err) {
      console.error(err)
      toast.error("Gagal mengunduh PDF.")
    } finally {
      setDownloadingPDF(false)
    }
  }

  const isLocked = existingNote?.isLocked ?? false

  const handleGenerateSummary = async () => {
    const answers = (candidate as any).formAnswers || []
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
          formResponse: answers.reduce((acc: any, curr: any) => {
            if (curr.question) {
              acc[curr.question.text] = curr.value || curr.answer
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
    } catch (err: any) {
      toast.error(err.message || "Gagal menghasilkan ringkasan AI")
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
          interviewerName: interviewerNameInput,
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

  const formEntries = (candidate as any).formAnswers || []
  const academicResponses = (candidate as any).academicResponses || []

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* HEADER SECTION */}
      <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
        <button
          onClick={() => router.back()}
          className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm shrink-0 mt-1"
        >
          <ArrowLeft className="h-4 w-4 text-slate-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{candidate.name}</h1>
            <Badge variant={candidate.level === "SD" ? "info" : "purple"}>
              LEVEL {candidate.level}
            </Badge>
            {isLocked && (
              <Badge variant="success" className="gap-1.5 uppercase font-bold text-[10px]">
                <Lock className="h-3 w-3" />
                DATA TERKUNCI
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Pendaftaran: <span className="text-slate-900 font-bold">{formatDate(candidate.createdAt)}</span>
            {" · "}Pewawancara: <span className="text-slate-900 font-bold">{candidate.selectedInterviewer || "TBA"}</span>
          </p>
        </div>
      </div>

      {/* MAIN CONTENT GRID (2 COLUMNS: LEFT 3/5, RIGHT 2/5) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* LEFT COLUMN: NOTES & FORM ANSWERS */}
        <div className="lg:col-span-3 space-y-6">
          {/* INTERVIEW NOTES */}
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {isLocked ? <Lock className="h-4 w-4 text-emerald-500" /> : <History className="h-4 w-4 text-blue-500" />}
                {isLocked ? "Catatan Observasi (Terkunci)" : "Isi Hasil Wawancara & Observasi"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLocked ? (
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-emerald-800 uppercase">Sudah Terkunci</p>
                      <p className="text-xs text-emerald-600 font-medium italic">Dikirim pada {formatDate(existingNote?.createdAt)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: "1. Observasi Umum", value: existingNote?.observation },
                      { label: "2. Kesiapan Akademik", value: existingNote?.academicAssessment },
                      { label: "3. Dukungan Keluarga", value: existingNote?.familySupport },
                      { label: "4. Karakter & Sikap", value: existingNote?.characterNotes },
                    ].map(({ label, value }) => (
                      <div key={label} className="space-y-1.5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</p>
                        <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[100px]">
                          {value}
                        </div>
                      </div>
                    ))}
                    {existingNote?.otherNotes && (
                      <div className="space-y-1.5 md:col-span-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">5. Catatan Tambahan</p>
                        <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[100px]">
                          {existingNote.otherNotes}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Rekomendasi</p>
                      <Badge variant={existingNote?.recommendation === "Terima" ? "success" : existingNote?.recommendation === "Tolak" ? "danger" : "warning"} className="text-sm px-6 py-1.5 rounded-xl font-bold uppercase italic">
                        {existingNote?.recommendation}
                      </Badge>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pewawancara</p>
                       <p className="text-sm font-bold text-slate-900 italic">{existingNote?.interviewerName}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Nama Pewawancara</label>
                    <input 
                      type="text"
                      placeholder="Masukkan nama lengkap Anda..."
                      value={interviewerNameInput}
                      onChange={(e) => setInterviewerNameInput(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Textarea label="1. Observasi Umum" placeholder="..." value={observation} onChange={(e) => setObservation(e.target.value)} className="min-h-[120px]" />
                    <Textarea label="2. Kesiapan Akademik" placeholder="..." value={academicAssessment} onChange={(e) => setAcademicAssessment(e.target.value)} className="min-h-[120px]" />
                    <Textarea label="3. Dukungan Keluarga" placeholder="..." value={familySupport} onChange={(e) => setFamilySupport(e.target.value)} className="min-h-[120px]" />
                    <Textarea label="4. Karakter & Sikap" placeholder="..." value={characterNotes} onChange={(e) => setCharacterNotes(e.target.value)} className="min-h-[120px]" />
                    <div className="md:col-span-2">
                      <Textarea label="5. Catatan Tambahan (Opsional)" placeholder="..." value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} className="min-h-[80px]" />
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-tight mb-4">Kesimpulan & Rekomendasi</p>
                    <div className="flex flex-wrap gap-3 mb-6">
                      {RECOMMENDATION_OPTIONS.map((opt) => (
                        <label key={opt.value} className={cn(
                          "flex-1 min-w-[140px] flex items-center justify-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                          recommendation === opt.value 
                            ? (opt.value === "Terima" ? "border-emerald-500 bg-emerald-50 shadow-sm" : opt.value === "Tolak" ? "border-rose-500 bg-rose-50 shadow-sm" : "border-amber-500 bg-amber-50 shadow-sm") 
                            : "border-slate-100 bg-white hover:border-slate-200"
                        )}>
                          <input type="radio" name="recommendation" value={opt.value} checked={recommendation === opt.value} onChange={() => setRecommendation(opt.value)} className="sr-only" />
                          <span className={cn(
                            "text-sm font-bold uppercase",
                            recommendation === opt.value ? (opt.value === "Terima" ? "text-emerald-700" : opt.value === "Tolak" ? "text-rose-700" : "text-amber-700") : "text-slate-400"
                          )}>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={() => setShowConfirm(true)} 
                      className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-lg transition-all" 
                      disabled={!interviewerNameInput || !observation || !academicAssessment || !familySupport || !characterNotes || !recommendation}
                    >
                      <Send className="h-4 w-4 mr-2" /> Simpan & Kunci Hasil Observasi
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* FORM RESPONSES */}
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900">Jawaban Formulir Orang Tua & Siswa</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-10">
                {/* Parent Section */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-emerald-500 rounded-full" /> Observasi Orang Tua
                  </h4>
                  <div className="grid gap-3">
                    {formEntries.filter((e: any) => e.question.category?.trim().toUpperCase() === "ORANG TUA").length > 0 ? (
                      formEntries.filter((e: any) => e.question.category?.trim().toUpperCase() === "ORANG TUA").map((entry: any) => (
                        <div key={entry.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-emerald-200 transition-all">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{entry.question.text}</p>
                          <p className="text-sm text-slate-700 font-bold leading-relaxed">{entry.answer || entry.value || "-"}</p>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 px-6 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 text-center">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic">Menunggu jawaban formulir dari orang tua...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Student Section */}
                {candidate.level !== "SD" && (
                  <div className="space-y-4 pt-8 border-t border-slate-100">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-blue-500 rounded-full" /> Wawancara Calon Siswa
                    </h4>
                    <div className="grid gap-3">
                      {formEntries.filter((e: any) => e.question.category?.trim().toUpperCase() === "SISWA").length > 0 ? (
                        formEntries.filter((e: any) => e.question.category?.trim().toUpperCase() === "SISWA").map((entry: any) => (
                          <div key={entry.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{entry.question.text}</p>
                            <p className="text-sm text-slate-700 font-bold leading-relaxed">{entry.answer || entry.value || "-"}</p>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 px-6 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 text-center">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic">Menunggu jawaban formulir dari calon siswa...</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: SIDEBAR (AI & ACADEMIC) */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI SUMMARY CARD */}
          <Card className="shadow-sm border-purple-100 bg-linear-to-br from-purple-50/30 to-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-purple-100/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">Analisis Profil (AI)</h3>
                  <p className="text-[9px] font-bold text-purple-500 uppercase tracking-widest leading-none">Powered by Gemini</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {!summary && !generatingSummary ? (
                <div className="text-center py-6 space-y-4">
                  <p className="text-xs text-slate-400 font-bold italic">Belum ada analisis profil.</p>
                  <Button 
                    onClick={handleGenerateSummary} 
                    disabled={generatingSummary}
                    size="sm" 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md"
                  >
                    {generatingSummary ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Generate Analisis
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatingSummary ? (
                    <SkeletonSummary />
                  ) : (
                    <>
                      <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-strong:text-purple-700 text-[13px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(summary!) }} />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleGenerateSummary} 
                        disabled={generatingSummary}
                        className="w-full h-9 border-purple-100 text-purple-600 hover:bg-purple-50 font-bold rounded-xl uppercase tracking-widest text-[9px]"
                      >
                        {generatingSummary ? <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> : null}
                        Generate Ulang
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ACADEMIC PERFORMANCE CARD */}
          {candidate.level === "SMP" && (
            <Card className="shadow-sm border-emerald-100 bg-linear-to-br from-emerald-50/30 to-white overflow-hidden">
              <CardHeader className="pb-3 border-b border-emerald-100/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                      <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">Observasi Akademik</h3>
                      <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest leading-none">1 Soal = 4 Poin</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowQrDialog(true)}
                    className="h-8 border-emerald-200 text-emerald-600 hover:bg-emerald-50 gap-2 font-bold text-[10px] uppercase tracking-wider"
                  >
                    <QrCode className="h-3 w-3" /> Akses Tes
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {candidate.academicTestResult ? (
                  <div className="space-y-6" onClick={() => setShowAcademicDetails(true)}>
                    <div className="text-center py-4 bg-white rounded-2xl border border-emerald-50 shadow-sm cursor-pointer hover:border-emerald-200 transition-all">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Skor Akhir</p>
                      <div className="text-5xl font-black text-slate-900 italic leading-none">{candidate.academicTestResult.totalScore.toFixed(0)}</div>
                      <div className="h-2 w-32 bg-slate-100 rounded-full mx-auto mt-4 overflow-hidden border border-slate-50">
                        <div className="h-full bg-emerald-500" style={{ width: `${candidate.academicTestResult.totalScore}%` }} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1 border-b border-slate-100 pb-1">Performa Subjek</p>
                      {(() => {
                        const stats = JSON.parse(candidate.academicTestResult.subjectScores)
                        return Object.entries(stats).map(([subject, data]: [string, any]) => {
                          const percentage = (data.correct / data.total) * 100
                          return (
                            <div key={subject} className="space-y-1">
                              <div className="flex justify-between items-end px-0.5">
                                <span className="text-[11px] font-bold text-slate-600">{subject}</span>
                                <span className="text-[10px] font-black text-emerald-600 italic">
                                  Nilai: {percentage.toFixed(0)} ({data.correct}/{data.total})
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                                <div className="h-full bg-emerald-500" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadAcademicPDF()
                        }}
                        disabled={downloadingPDF}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        {downloadingPDF ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                        Unduh PDF
                      </Button>
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadAsExcel()
                        }}
                        className="flex-1 bg-white border-2 border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold h-10 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <Download size={14} />
                        Unduh Excel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-200">
                      <GraduationCap className="h-8 w-8" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Belum ada hasil tes</p>
                    <Button 
                      onClick={() => setShowQrDialog(true)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md h-10 uppercase text-[10px] tracking-widest"
                    >
                      Mulai Tes (Tampilkan QR)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* DIALOGS */}

      {/* QR Code Access Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="rounded-[40px] p-0 overflow-hidden max-w-sm border-none shadow-2xl">
          <div className="bg-emerald-600 p-8 text-center text-white">
            <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tight">Akademik SMP</h2>
            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Akses Umum - Siswa Pilih Nama Sendiri</p>
          </div>
          <div className="p-10 bg-white flex flex-col items-center">
            <div className="p-4 bg-white border-4 border-slate-50 rounded-[32px] shadow-inner mb-6">
              <img 
                src={origin ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${origin}/academic`)}` : ""}
                alt="QR Code Akademik"
                className="w-[200px] h-[200px]"
              />
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Link Akses Umum</p>
              <p className="text-[10px] font-bold text-slate-600 break-all select-all">{origin}/academic</p>
            </div>
          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-100">
            <Button onClick={() => setShowQrDialog(false)} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-bold uppercase tracking-widest text-xs">Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Academic Details Dialog */}
      <Dialog open={showAcademicDetails} onOpenChange={setShowAcademicDetails}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden p-0 rounded-3xl border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900 uppercase tracking-tight">Detail Jawaban Akademik</DialogTitle>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-widest italic">{candidate.name} · Skor: {candidate.academicTestResult?.totalScore.toFixed(0)}</p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Metode</p>
                 <p className="text-xs font-bold text-emerald-600 italic">1 Soal = 4 Poin</p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] bg-slate-50/30">
            {academicResponses.length === 0 ? (
              <div className="py-20 text-center">
                <AlertCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest italic text-xs">Data tidak ditemukan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {academicResponses.sort((a: any, b: any) => a.question.order - b.question.order).map((resp: any, idx: number) => {
                  const isCorrect = resp.isCorrect;
                  return (
                    <div key={resp.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:border-emerald-200 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                            isCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                          )}>
                            {idx + 1}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {resp.question.subject}
                          </span>
                        </div>
                        <Badge variant={isCorrect ? "success" : "danger"} className="h-6 text-[9px] font-black px-2 rounded-lg">
                          {isCorrect ? "BENAR" : "SALAH"}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-slate-800 leading-relaxed mb-6 flex-1">{resp.question.text}</p>
                      <div className="grid grid-cols-2 gap-3 mt-auto">
                        <div className={cn("p-3 rounded-xl border flex flex-col justify-center", isCorrect ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-none">Jawaban Siswa</span>
                          <span className={cn("text-xs font-bold", isCorrect ? "text-emerald-700" : "text-rose-700")}>{resp.answer}</span>
                        </div>
                        {!isCorrect ? (
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-center">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 leading-none">Kunci</span>
                            <span className="text-xs font-bold text-emerald-400">{resp.question.correctAnswer}</span>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-emerald-500 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-white opacity-40" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          <div className="p-5 bg-white border-t border-slate-100 flex justify-end">
             <Button onClick={() => setShowAcademicDetails(false)} className="h-11 px-8 rounded-xl bg-slate-900 text-white font-bold uppercase tracking-widest text-xs">Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Save Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="rounded-3xl p-10 max-w-md border-none shadow-2xl">
          <DialogHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-500">
              <Lock size={32} />
            </div>
            <DialogTitle className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Kunci Data?</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Data yang sudah dikunci tidak dapat diubah kembali. Pastikan semua hasil observasi sudah benar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-3 pt-6">
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="h-12 px-6 rounded-xl border-2 border-slate-100 font-bold text-slate-500 hover:bg-slate-50 uppercase tracking-widest text-xs">Batal</Button>
            <Button onClick={handleSubmitNote} disabled={submitting} className="h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg uppercase tracking-widest text-xs">Ya, Kunci</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
