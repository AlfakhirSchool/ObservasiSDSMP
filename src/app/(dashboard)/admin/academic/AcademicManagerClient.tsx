"use client"

import { useState, useEffect } from "react"
import {
  Plus, Search, Image as ImageIcon,
  Trash2, Edit3, Check, CheckCircle2,
  Layers, Loader2, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"

const SUBJECTS = ["Matematika", "Bahasa Indonesia", "Bahasa Inggris", "IPA", "IPS", "Lainnya"]

interface AcademicQuestion {
  id: string
  text: string
  subject: string
  imageUrl: string | null
  options: string[]
  correctAnswer: string
  order: number
}

const FIELD_LABEL = "block text-sm font-medium text-slate-700"
const FIELD_INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
const ICON_BUTTON =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"

export default function AcademicManagerClient() {
  const [questions, setQuestions] = useState<AcademicQuestion[]>([])
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
      const data: AcademicQuestion[] = await res.json()
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

  const handleOpenEdit = (q: AcademicQuestion) => {
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

  const isFiltering = searchTerm !== "" || selectedSubject !== "Semua"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Soal Akademik"
        description={
          <>
            Buat dan atur soal tes akademik calon siswa
            {!loading && (
              <span className="mt-1 block font-medium tabular-nums text-slate-700">
                {questions.length} soal
              </span>
            )}
          </>
        }
        actions={
          <Button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus size={16} />
            Buat Soal
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Cari teks soal..."
            aria-label="Cari teks soal"
            className={cn(FIELD_INPUT, "h-10 pl-9")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter mata pelajaran">
          {["Semua", ...SUBJECTS].map(sub => {
            const active = selectedSubject === sub
            return (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                aria-pressed={active}
                className={cn(
                  "h-8 whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                  active
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {sub}
              </button>
            )
          })}
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500" role="status">
          <Loader2 size={18} className="animate-spin" />
          Memuat bank soal...
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={Layers}
            title={isFiltering ? "Tidak ada soal yang cocok" : "Belum ada soal"}
            description={
              isFiltering
                ? "Ubah kata kunci pencarian atau pilih mata pelajaran lain."
                : "Klik \"Buat Soal\" untuk menambahkan soal akademik pertama."
            }
            action={
              !isFiltering && (
                <Button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus size={16} />
                  Buat Soal
                </Button>
              )
            }
          />
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredQuestions.map((q) => (
            <li
              key={q.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                    {q.subject}
                  </span>
                  <span className="text-xs font-medium tabular-nums text-slate-500">
                    Urutan {q.order}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(q)}
                    className={cn(ICON_BUTTON, "hover:bg-slate-100 hover:text-slate-700")}
                    aria-label="Edit soal"
                    title="Edit soal"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(q.id)}
                    className={cn(ICON_BUTTON, "hover:bg-rose-50 hover:text-rose-600")}
                    aria-label="Hapus soal"
                    title="Hapus soal"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div
                className={cn(
                  "grid grid-cols-1 gap-5",
                  q.imageUrl && "lg:grid-cols-[minmax(0,1fr)_240px]"
                )}
              >
                <div className="min-w-0 space-y-4">
                  <h3 className="text-base font-medium leading-relaxed text-slate-900">{q.text}</h3>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {q.options.map((opt, i) => {
                      const correct = q.correctAnswer === opt
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                            correct
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                              : "border-slate-200 bg-white text-slate-700"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                              correct ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="min-w-0 flex-1 break-words text-sm">{opt}</span>
                          {correct && (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700">
                              <Check size={14} aria-hidden="true" />
                              Jawaban benar
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {q.imageUrl && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 lg:self-start">
                    <img
                      src={q.imageUrl}
                      alt={`Gambar soal urutan ${q.order}`}
                      className="max-h-48 w-full object-contain"
                    />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal} className="max-w-5xl">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="shrink-0 border-b border-slate-100 px-6 py-4">
            <div>
              <DialogTitle>{isEditing ? "Edit Soal" : "Buat Soal Baru"}</DialogTitle>
              <p className="mt-0.5 text-sm text-slate-500">Lengkapi detail butir soal di bawah.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              aria-label="Tutup"
              title="Tutup"
            >
              <X size={18} />
            </button>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:overflow-hidden">
            {/* Editor */}
            <DialogContent className="space-y-5 px-6 py-5 lg:overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="academic-subject" className={FIELD_LABEL}>Mata Pelajaran</label>
                  <select
                    id="academic-subject"
                    className={cn(FIELD_INPUT, "h-10 cursor-pointer")}
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  >
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="academic-order" className={FIELD_LABEL}>Urutan Tampil</label>
                  <input
                    id="academic-order"
                    type="number"
                    className={cn(FIELD_INPUT, "h-10 tabular-nums")}
                    value={formData.order}
                    onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="academic-text" className={FIELD_LABEL}>Teks Pertanyaan</label>
                <textarea
                  id="academic-text"
                  className={cn(FIELD_INPUT, "h-28 resize-none py-2.5 leading-relaxed")}
                  placeholder="Tuliskan pertanyaan di sini..."
                  value={formData.text}
                  onChange={(e) => setFormData({...formData, text: e.target.value})}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-1.5">
                <span className={FIELD_LABEL}>Gambar Soal (Opsional)</span>

                {formData.imageUrl ? (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <img src={formData.imageUrl} className="h-40 w-full object-contain" alt="Pratinjau gambar soal" />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => (document.getElementById("image-upload") as HTMLInputElement).click()}
                      >
                        Ganti
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                        onClick={() => setFormData({...formData, imageUrl: ""})}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => (document.getElementById("image-upload") as HTMLInputElement).click()}
                    className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                  >
                    <ImageIcon className="text-slate-400" size={22} aria-hidden="true" />
                    <span className="text-sm font-medium text-slate-700">Klik untuk unggah gambar</span>
                    <span className="text-xs text-slate-500">Maksimal 2MB (PNG/JPG)</span>
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

              {/* Options */}
              <fieldset className="space-y-2">
                <legend className={FIELD_LABEL}>Pilihan Jawaban</legend>
                <p className="text-xs text-slate-500">Tekan ikon centang untuk menandai jawaban yang benar.</p>
                <div className="space-y-2">
                  {formData.options.map((opt, i) => {
                    const correct = formData.correctAnswer === opt && opt !== ""
                    const letter = String.fromCharCode(65 + i)
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
                            correct ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {letter}
                        </span>
                        <input
                          type="text"
                          placeholder={`Pilihan ${letter}`}
                          aria-label={`Pilihan ${letter}`}
                          className={cn(
                            FIELD_INPUT,
                            "h-10 flex-1",
                            correct && "border-emerald-300 bg-emerald-50"
                          )}
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...formData.options]
                            newOptions[i] = e.target.value
                            setFormData({...formData, options: newOptions})
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, correctAnswer: opt})}
                          aria-pressed={correct}
                          aria-label={`Tandai pilihan ${letter} sebagai jawaban benar`}
                          title={correct ? "Jawaban benar" : "Tandai sebagai jawaban benar"}
                          className={cn(
                            ICON_BUTTON,
                            "h-10 w-10",
                            correct ? "bg-emerald-50 text-emerald-600" : "hover:bg-slate-100 hover:text-slate-600"
                          )}
                        >
                          <CheckCircle2 size={20} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </fieldset>
            </DialogContent>

            {/* Preview */}
            <aside className="hidden border-l border-slate-100 bg-slate-50 px-6 py-5 lg:block lg:overflow-y-auto">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Pratinjau Siswa</h4>
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                  {formData.subject}
                </span>

                <p className={cn("text-base font-medium leading-relaxed", formData.text ? "text-slate-900" : "text-slate-500")}>
                  {formData.text || "Tuliskan teks soal untuk melihat pratinjau..."}
                </p>

                {formData.imageUrl && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img src={formData.imageUrl} className="max-h-48 w-full object-contain" alt="Pratinjau gambar soal" />
                  </div>
                )}

                <div className="space-y-2">
                  {formData.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className={cn("min-w-0 flex-1 break-words text-sm", opt ? "text-slate-700" : "text-slate-400")}>
                        {opt || `Pilihan ${String.fromCharCode(65 + i)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">Tampilan saat dikerjakan oleh siswa.</p>
            </aside>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Batal
            </Button>
            <Button type="button" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
              Simpan Soal
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
