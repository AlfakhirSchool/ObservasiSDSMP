"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Plus,
  Trash2,
  Edit3,
  HelpCircle,
  Save,
  X,
  Loader2,
  QrCode
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { addQuestion, deleteQuestion, updateQuestion } from "@/lib/actions"
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"

interface Question {
  id: string
  text: string
  type: string
  category: string
  order: number
  level: string | null
  isSystem: boolean
  options?: string[]
}

interface Props {
  initialQuestions: Question[]
}

export default function AdminQuestionsClient({ initialQuestions }: Props) {
  const router = useRouter()
  const [activeLevel, setActiveLevel] = useState<"SD" | "SMP">("SMP")
  const [activeCategory, setActiveCategory] = useState<"ORANG TUA" | "SISWA">("ORANG TUA")
  const [questions, setQuestions] = useState(initialQuestions)
  const [isAdding, setIsAdding] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [loading, setLoading] = useState(false)
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  const filteredQuestions = questions.filter(q => (q.level === activeLevel || q.level === null) && q.category === activeCategory)

  const handleDelete = async (id: string) => {
    if (confirm("Hapus pertanyaan ini?")) {
      await deleteQuestion(id)
      router.refresh()
    }
  }

  const formatText = (text: string) => {
    if (!text) return ""
    return text.length > 100 ? text.substring(0, 100) + "..." : text
  }

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <h2 className="text-[22px] font-bold text-slate-900 m-0 tracking-tight italic uppercase">Manajemen Soal Observasi</h2>
          <p className="text-[13px] text-slate-400 m-0 mt-1">Konfigurasi pertanyaan berdasarkan jenjang sekolah</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={async () => {
              if (confirm("Sinkronkan seluruh soal SD & SMP? Seluruh data soal lama akan dihapus.")) {
                const res = await fetch("/api/public/seed")
                if (res.ok) {
                  alert("Berhasil sinkronisasi seluruh soal!")
                  router.refresh()
                }
              }
            }}
            className="h-10 border-slate-200 text-slate-600 rounded-xl px-5 text-[13px] font-bold bg-white"
          >
            Sync Semua Soal
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowQR(true)}
            className="h-10 border-slate-200 text-slate-600 rounded-xl px-4 text-[13px] font-bold bg-white"
          >
            <QrCode size={18} className="mr-2" />
            QR Soal {activeLevel}
          </Button>
          <Button 
            onClick={() => setIsAdding(true)}
            className="h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 text-[13px] font-bold shadow-lg shadow-slate-900/20"
          >
            <Plus size={18} className="mr-2" />
            Tambah Soal Baru
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
        {/* Main Tabs (SD/SMP) */}
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200">
          <button 
            onClick={() => {
              setActiveLevel("SD")
              setActiveCategory("ORANG TUA")
            }}
            className={cn(
              "px-8 py-2.5 rounded-xl text-[13px] font-black uppercase tracking-tight transition-all",
              activeLevel === "SD" 
                ? "bg-white text-blue-600 shadow-lg border border-slate-200" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Unit SD
          </button>
          <button 
            onClick={() => setActiveLevel("SMP")}
            className={cn(
              "px-8 py-2.5 rounded-xl text-[13px] font-black uppercase tracking-tight transition-all",
              activeLevel === "SMP" 
                ? "bg-white text-purple-600 shadow-lg border border-slate-200" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Unit SMP
          </button>
        </div>

        {/* Sub Tabs (Parent/Student) */}
        <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <button 
            onClick={() => setActiveCategory("ORANG TUA")}
            className={cn(
              "px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeCategory === "ORANG TUA" 
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                : "text-slate-400 hover:bg-slate-50"
            )}
          >
            <div className={cn("w-1.5 h-1.5 rounded-full", activeCategory === "ORANG TUA" ? "bg-white" : "bg-emerald-500")} />
            Orang Tua
          </button>
          {activeLevel === "SMP" && (
            <button 
              onClick={() => setActiveCategory("SISWA")}
              className={cn(
                "px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeCategory === "SISWA" 
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" 
                  : "text-slate-400 hover:bg-slate-50"
              )}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full", activeCategory === "SISWA" ? "bg-white" : "bg-blue-500")} />
              Calon Siswa
            </button>
          )}
        </div>
      </div>

      {/* Question list */}
      <div className="flex flex-col gap-3">
        {filteredQuestions.length === 0 ? (
          <div className="py-24 text-center bg-white border-2 border-dashed border-slate-100 rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <HelpCircle size={32} className="text-slate-300" />
            </div>
            <div className="text-[15px] font-bold text-slate-600 mb-1">Belum ada pertanyaan untuk Unit {activeLevel}</div>
            <div className="text-[13px] text-slate-400">Klik "Tambah Soal Baru" atau "Sync" untuk mengisi data</div>
          </div>
        ) : (
          filteredQuestions.sort((a, b) => a.order - b.order).map((q, i) => (
            <div 
              key={q.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-6 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 group-hover:bg-primary transition-colors" />
              
              {/* Number with better style */}
              <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-[16px] font-black shrink-0 border border-slate-100 group-hover:bg-linear-to-br group-hover:from-primary group-hover:to-primary-dark group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-500">
                {String(i + 1).padStart(2, '0')}
              </div>
              
              {/* Question text */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg",
                    q.category === "ORANG TUA" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {q.category === "ORANG TUA" ? "Orang Tua" : "Siswa"}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Unit {activeLevel}
                  </span>
                </div>
                <div className="text-[16px] font-bold text-slate-800 leading-relaxed group-hover:text-slate-900 transition-colors">
                  {q.text}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 shrink-0">
                {!q.isSystem ? (
                  <>
                    <button 
                      onClick={() => setEditingQuestion(q)}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
                      title="Edit Soal"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(q.id)}
                      className="w-10 h-10 rounded-xl border border-rose-100 bg-rose-50 flex items-center justify-center text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 hover:shadow-lg hover:shadow-rose-500/20 transition-all duration-300"
                      title="Hapus Soal"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistem (Permanen)</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Dialogs */}
      {(isAdding || editingQuestion) && (
        <Dialog 
          open={isAdding || !!editingQuestion} 
          onOpenChange={(open) => {
            if (!open) { setIsAdding(false); setEditingQuestion(null); }
          }}
        >
          <DialogContent className="max-w-md rounded-3xl p-0 bg-white overflow-hidden border-none shadow-2xl">
            <DialogHeader className="px-8 pt-8 pb-4 bg-slate-50/50">
              <DialogTitle className="text-[18px] font-black text-slate-900 uppercase tracking-tight">
                {isAdding ? "Tambah Soal Baru" : "Edit Pertanyaan"}
              </DialogTitle>
            </DialogHeader>
            
            <form 
              onSubmit={async (e) => {
                e.preventDefault()
                setLoading(true)
                const formData = new FormData(e.currentTarget)
                const optionsRaw = formData.get("options") as string
                const options = optionsRaw ? optionsRaw.split(",").map(o => o.trim()).filter(o => o) : []
                
                const data = {
                  text: formData.get("text") as string,
                  category: formData.get("category") as string,
                  type: formData.get("type") as string,
                  order: parseInt(formData.get("order") as string),
                  level: activeLevel as any,
                  options: options,
                }
                
                if (editingQuestion) {
                  await updateQuestion(editingQuestion.id, data)
                } else {
                  await addQuestion(data)
                }
                
                setLoading(false)
                setIsAdding(false)
                setEditingQuestion(null)
                router.refresh()
              }}
              className="p-8 space-y-5"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Target Responden</label>
                  <select 
                    name="category"
                    defaultValue={editingQuestion?.category || "ORANG TUA"}
                    required
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-[13px] outline-none focus:border-primary transition-all bg-slate-50/50 font-bold cursor-pointer"
                  >
                    <option value="ORANG TUA">Orang Tua</option>
                    <option value="SISWA">Calon Siswa</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tipe Jawaban</label>
                  <select 
                    name="type"
                    id="question-type"
                    defaultValue={editingQuestion?.type || "long_text"}
                    required
                    onChange={(e) => {
                      const optionsDiv = document.getElementById("options-container");
                      if (optionsDiv) optionsDiv.style.display = e.target.value === "choice" ? "block" : "none";
                    }}
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-[13px] outline-none focus:border-primary transition-all bg-slate-50/50 font-bold cursor-pointer"
                  >
                    <option value="text">Teks Pendek</option>
                    <option value="long_text">Paragraf Panjang</option>
                    <option value="choice">Pilihan (Multiple Choice)</option>
                    <option value="rating">Penilaian (1-5)</option>
                  </select>
                </div>
              </div>

              <div id="options-container" className="space-y-1.5" style={{ display: editingQuestion?.type === "choice" ? "block" : "none" }}>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Pilihan Jawaban (Pisahkan dengan koma)</label>
                <input 
                  name="options"
                  defaultValue={editingQuestion?.options?.join(", ") || ""}
                  placeholder="Contoh: Sanggup, Tidak Sanggup, Ragu-ragu"
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 text-[13px] outline-none focus:border-primary transition-all bg-slate-50/50 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Isi Pertanyaan</label>
                <textarea 
                  name="text"
                  defaultValue={editingQuestion?.text || ""}
                  required
                  rows={3}
                  placeholder="Tuliskan pertanyaan observasi..."
                  className="w-full border border-slate-200 rounded-xl p-4 text-[14px] outline-none focus:border-primary transition-all bg-slate-50/50 font-medium leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nomor Urut</label>
                <input 
                  name="order"
                  type="number"
                  defaultValue={editingQuestion?.order || (filteredQuestions.length + 1)}
                  required
                  className="w-24 h-11 border border-slate-200 rounded-xl px-4 text-[14px] outline-none focus:border-primary transition-all bg-slate-50/50 font-bold"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => { setIsAdding(false); setEditingQuestion(null); }}
                  className="flex-1 h-12 rounded-xl border-slate-200 text-slate-500 font-bold"
                >
                  Batal
                </Button>
                <Button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-bold shadow-lg"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Simpan Soal"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* SIMPAN PERUBAHAN — fixed bottom right button */}
      <div className="fixed bottom-10 right-10 z-50">
        <Button 
          onClick={() => router.refresh()}
          className="flex items-center gap-3 px-8 py-4 bg-primary hover:bg-primary-dark text-white text-[15px] font-black rounded-2xl shadow-2xl shadow-emerald-500/40 transition-all hover:scale-105 active:scale-95 h-auto uppercase tracking-wider"
        >
          <Save size={20} />
          Selesai & Muat Ulang
        </Button>
      </div>

      {/* QR Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="max-w-xs rounded-3xl p-8 bg-white overflow-hidden text-center">
          <DialogTitle className="text-[18px] font-black text-slate-900 uppercase tracking-tight mb-6">
            Akses Soal {activeLevel}
          </DialogTitle>
          
          <div className="bg-white p-4 rounded-3xl border-4 border-slate-100 shadow-xl mb-6 flex items-center justify-center">
            {origin && (
              <QRCodeSVG 
                value={`https://dashboard-alfakhir.vercel.app/questions/${activeLevel.toLowerCase()}`} 
                size={200}
                level="H"
              />
            )}
          </div>
          
          <p className="text-[12px] text-slate-400 font-medium leading-relaxed mb-6">
            Scan QR ini untuk melihat daftar pertanyaan Unit {activeLevel} di perangkat lain.
          </p>

          <Button 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl"
            onClick={() => setShowQR(false)}
          >
            Tutup
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
