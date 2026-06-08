"use client"

import { useState, useEffect } from "react"
import { 
  Plus, Search, BookOpen, Image as ImageIcon, 
  Trash2, Edit3, ChevronRight, CheckCircle2, 
  AlertCircle, Layout, Save, X, Layers
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

const SUBJECTS = ["Matematika", "Bahasa Indonesia", "Bahasa Inggris", "IPA", "IPS", "Lainnya"]

export default function AcademicManagerClient() {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSubject, setSelectedSubject] = useState<string>("Semua")
  const [isEditing, setIsEditing] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Form State
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    text: "",
    subject: "Matematika",
    imageUrl: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    order: 0
  })

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      const res = await fetch("/api/admin/academic")
      const data = await res.json()
      setQuestions(data)
      setLoading(false)
    } catch (error) {
      toast.error("Gagal mengambil data soal")
    }
  }

  const handleOpenCreate = () => {
    setCurrentId(null)
    setFormData({
      text: "",
      subject: "Matematika",
      imageUrl: "",
      options: ["", "", "", ""],
      correctAnswer: "",
      order: questions.length + 1
    })
    setIsEditing(false)
    setShowModal(true)
  }

  const handleOpenEdit = (q: any) => {
    setCurrentId(q.id)
    setFormData({
      text: q.text,
      subject: q.subject,
      imageUrl: q.imageUrl || "",
      options: [...q.options],
      correctAnswer: q.correctAnswer,
      order: q.order
    })
    setIsEditing(true)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus soal ini selamanya?")) return
    try {
      const res = await fetch(`/api/admin/academic/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Soal berhasil dihapus")
        fetchQuestions()
      }
    } catch (error) {
      toast.error("Gagal menghapus soal")
    }
  }

  const handleSave = async () => {
    if (!formData.text || !formData.correctAnswer || formData.options.some(o => !o)) {
      toast.error("Mohon lengkapi semua data soal")
      return
    }

    try {
      const url = isEditing ? `/api/admin/academic/${currentId}` : "/api/admin/academic"
      const method = isEditing ? "PUT" : "POST"
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success(isEditing ? "Soal diperbarui" : "Soal baru ditambahkan")
        setShowModal(false)
        fetchQuestions()
      }
    } catch (error) {
      toast.error("Gagal menyimpan soal")
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran gambar terlalu besar (maks 2MB)")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData({ ...formData, imageUrl: reader.result as string })
      toast.success("Gambar berhasil diunggah")
    }
    reader.readAsDataURL(file)
  }

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSubject = selectedSubject === "Semua" || q.subject === selectedSubject
    return matchesSearch && matchesSubject
  })

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Bar: Filter & Add */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40">
        <div className="md:col-span-4 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
          <input 
            type="text" 
            placeholder="Cari teks soal..."
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-slate-900 transition-all font-bold text-sm text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="md:col-span-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {["Semua", ...SUBJECTS].map(sub => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={cn(
                "px-5 h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2",
                selectedSubject === sub 
                  ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20" 
                  : "bg-white text-slate-400 border-slate-50 hover:border-slate-200"
              )}
            >
              {sub}
            </button>
          ))}
        </div>

        <div className="md:col-span-3 flex justify-end">
          <Button 
            onClick={handleOpenCreate}
            className="w-full h-12 bg-slate-900 hover:bg-black text-white font-black italic rounded-2xl shadow-xl shadow-slate-900/20 transition-all active:scale-95 flex gap-2"
          >
            <Plus size={18} />
            BUAT SOAL BARU
          </Button>
        </div>
      </div>

      {/* Questions List */}
      <div className="grid grid-cols-1 gap-6 pb-20">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Memuat Bank Soal...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-200 text-center space-y-4">
            <Layers className="h-12 w-12 text-slate-200 mx-auto" />
            <p className="text-sm font-bold text-slate-400 italic uppercase tracking-tight">Belum ada soal untuk kategori ini</p>
          </div>
        ) : (
          filteredQuestions.map((q, idx) => (
            <div 
              key={q.id}
              className="group bg-white rounded-[40px] border border-slate-100 p-8 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 relative overflow-hidden"
            >
              {/* Subject Tag */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Badge className="bg-slate-900 hover:bg-slate-900 text-white px-4 py-1 rounded-full text-[10px] font-black italic uppercase tracking-widest">
                    {q.subject}
                  </Badge>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Order: {q.order}</span>
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => handleOpenEdit(q)}
                    className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center border border-slate-100"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(q.id)}
                    className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center border border-slate-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-6">
                  <h3 className="text-[20px] font-black text-slate-900 leading-tight tracking-tight uppercase italic">{q.text}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt: string, i: number) => (
                      <div 
                        key={i}
                        className={cn(
                          "p-4 rounded-2xl border-2 flex items-center gap-4 transition-all",
                          q.correctAnswer === opt 
                            ? "bg-emerald-50 border-emerald-500 text-emerald-900" 
                            : "bg-slate-50/50 border-slate-50 text-slate-500"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-black text-[12px]",
                          q.correctAnswer === opt ? "bg-emerald-500 text-white" : "bg-white text-slate-300"
                        )}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className="text-[13px] font-bold tracking-tight">{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-4 flex items-center justify-center">
                  {q.imageUrl ? (
                    <div className="relative group/img overflow-hidden rounded-[32px] border-4 border-slate-50 shadow-xl shadow-slate-100 transition-transform hover:scale-[1.02] duration-500">
                      <img src={q.imageUrl} alt="Question" className="max-w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="text-white" size={24} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-40 rounded-[32px] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 grayscale opacity-50">
                      <ImageIcon className="text-slate-300" size={32} />
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Tidak ada gambar</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[95vw] w-full lg:w-[1200px] lg:max-w-none p-0 overflow-hidden border-none rounded-[40px] shadow-2xl bg-white">
          <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
            {/* Left side: Editor */}
            <div className="flex-1 p-8 lg:p-12 space-y-8 overflow-y-auto custom-scrollbar border-r border-slate-50">
              <div className="space-y-1">
                <DialogTitle className="text-[24px] font-black text-slate-900 uppercase italic tracking-tighter">
                  {isEditing ? "Edit Soal" : "Buat Soal Baru"}
                </DialogTitle>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Lengkapi detail butir soal di bawah</p>
              </div>

              <div className="space-y-6">
                {/* Subject & Order */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Mata Pelajaran</label>
                    <select 
                      className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-slate-50 focus:border-slate-900 outline-none font-bold text-sm"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    >
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Urutan Tampil</label>
                    <input 
                      type="number"
                      className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-slate-50 focus:border-slate-900 outline-none font-bold text-sm"
                      value={formData.order}
                      onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                {/* Question Text */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Teks Pertanyaan</label>
                  <textarea 
                    className="w-full h-32 p-4 rounded-xl bg-slate-50 border-2 border-slate-50 focus:border-slate-900 outline-none font-bold text-sm resize-none"
                    placeholder="Tuliskan pertanyaan di sini..."
                    value={formData.text}
                    onChange={(e) => setFormData({...formData, text: e.target.value})}
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic flex items-center gap-2">
                    <ImageIcon size={12} />
                    Gambar Soal (Opsional)
                  </label>
                  
                  <div className="relative group">
                    {formData.imageUrl ? (
                      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-100 group">
                        <img src={formData.imageUrl} className="w-full h-48 object-contain bg-slate-50" alt="Preview" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="rounded-xl font-bold"
                            onClick={() => (document.getElementById("image-upload") as HTMLInputElement).click()}
                          >
                            Ganti
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="rounded-xl font-bold"
                            onClick={() => setFormData({...formData, imageUrl: ""})}
                          >
                            Hapus
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => (document.getElementById("image-upload") as HTMLInputElement).click()}
                        className="w-full h-48 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 transition-all flex flex-col items-center justify-center gap-3 group"
                      >
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Plus className="text-slate-400" size={20} />
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Klik untuk Upload</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Maksimal 2MB (PNG/JPG)</p>
                        </div>
                      </button>
                    )}
                    <input 
                      id="image-upload"
                      type="file" 
                      accept="image/*"
                      className="hidden" 
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Pilihan Jawaban</label>
                  <div className="space-y-3">
                    {formData.options.map((opt, i) => (
                      <div key={i} className="flex gap-3 items-center">
                        <div className={cn(
                          "w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-black text-[12px] transition-all",
                          formData.correctAnswer === opt && opt !== "" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <input 
                          type="text"
                          placeholder={`Pilihan ${String.fromCharCode(65 + i)}`}
                          className={cn(
                            "flex-1 h-12 px-4 rounded-xl border-2 transition-all font-bold text-sm outline-none",
                            formData.correctAnswer === opt && opt !== "" ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-50 focus:border-slate-900"
                          )}
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...formData.options]
                            newOptions[i] = e.target.value
                            setFormData({...formData, options: newOptions})
                          }}
                        />
                        <button 
                          onClick={() => setFormData({...formData, correctAnswer: opt})}
                          className={cn(
                            "p-3 rounded-xl transition-all",
                            formData.correctAnswer === opt && opt !== "" ? "text-emerald-500 bg-emerald-50" : "text-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <CheckCircle2 size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
                <Button 
                  onClick={() => setShowModal(false)}
                  variant="ghost"
                  className="flex-1 h-14 rounded-2xl font-black text-slate-400 uppercase tracking-widest"
                >
                  Batal
                </Button>
                <Button 
                  onClick={handleSave}
                  style={{ flex: 2 }}
                  className="h-14 bg-slate-900 hover:bg-black text-white font-black italic rounded-2xl shadow-2xl shadow-slate-900/20 flex gap-3"
                >
                  <Save size={18} />
                  SIMPAN SOAL
                </Button>
              </div>
            </div>

            {/* Right side: Real-time Preview */}
            <div className="hidden lg:flex flex-1 bg-slate-950 p-12 flex-col overflow-hidden">
              <div className="space-y-1 mb-10">
                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Student Preview</h4>
                <div className="h-px w-20 bg-slate-800" />
              </div>

              <div className="flex-1 bg-[#F8FAFC] rounded-[40px] p-8 shadow-inner overflow-y-auto custom-scrollbar relative">
                {/* Simulated Student Portal Header */}
                <div className="flex items-center gap-3 mb-8 opacity-50">
                  <div className="w-8 h-8 rounded-lg bg-slate-200" />
                  <div className="space-y-1">
                    <div className="h-2 w-20 bg-slate-200 rounded-full" />
                    <div className="h-1.5 w-12 bg-slate-200 rounded-full" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-50 text-[8px] px-2 py-0.5 rounded-full uppercase italic">
                      {formData.subject}
                    </Badge>
                  </div>

                  <h5 className="text-[16px] font-black text-slate-900 leading-tight tracking-tight uppercase italic">
                    {formData.text || "Tuliskan teks soal untuk melihat pratinjau..."}
                  </h5>

                  {formData.imageUrl && (
                    <div className="p-3 bg-white rounded-2xl border-2 border-slate-100">
                      <div className="aspect-video bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden">
                         {formData.imageUrl.startsWith("/") || formData.imageUrl.startsWith("http") ? (
                           <img src={formData.imageUrl} className="max-w-full h-auto" />
                         ) : (
                           <ImageIcon className="text-slate-200" size={32} />
                         )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {formData.options.map((opt, i) => (
                      <div key={i} className="p-4 bg-white rounded-[20px] border-2 border-slate-50 flex items-center gap-4 shadow-sm opacity-80 scale-95">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-black text-[10px] text-slate-300">
                          {String.fromCharCode(65 + i)}
                        </div>
                        <div className="h-2 flex-1 bg-slate-100 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating Note */}
                <div className="absolute bottom-6 left-6 right-6 p-4 bg-slate-900/10 backdrop-blur-md rounded-2xl border border-white/20">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-center italic">
                    Tampilan saat dikerjakan oleh siswa
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Info */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-100 shadow-2xl z-40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Database Terkoneksi</span>
        </div>
        <div className="w-px h-4 bg-slate-200" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total: {questions.length} Soal</span>
      </div>
    </div>
  )
}
