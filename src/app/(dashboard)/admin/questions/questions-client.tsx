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
  Loader2,
  QrCode,
  Lock,
  RefreshCw,
  X,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { addQuestion, deleteQuestion, updateQuestion } from "@/lib/actions"
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/ui/empty-state"

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

type Level = "SD" | "SMP"
type Category = "ORANG TUA" | "SISWA"

const FIELD_LABEL = "block text-sm font-medium text-slate-700"
const FIELD_INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:bg-slate-50"
const ICON_BUTTON =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"

interface SegmentOption<T extends string> {
  value: T
  label: string
  count: number
  disabled?: boolean
  disabledHint?: string
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex w-fit rounded-xl bg-slate-100 p-1">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={opt.disabled}
            title={opt.disabled ? opt.disabledHint : undefined}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {opt.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs tabular-nums",
                active ? "bg-slate-100 text-slate-700" : "text-slate-500"
              )}
            >
              {opt.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function UnitBadge({ level }: { level: Level }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase ring-1 ring-inset",
        level === "SD"
          ? "bg-[#E67E22]/10 text-[#B35F10] ring-[#E67E22]/30"
          : "bg-[#0D5C63]/10 text-[#0D5C63] ring-[#0D5C63]/25"
      )}
    >
      {level}
    </span>
  )
}

export default function AdminQuestionsClient({ initialQuestions }: Props) {
  const router = useRouter()
  const [activeLevel, setActiveLevel] = useState<Level>("SMP")
  const [activeCategory, setActiveCategory] = useState<Category>("ORANG TUA")
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

  const forLevel = (level: Level) => initialQuestions.filter(q => q.level === level || q.level === null)
  const levelQuestions = forLevel(activeLevel)
  const filteredQuestions = levelQuestions
    .filter(q => q.category === activeCategory)
    .sort((a, b) => a.order - b.order)
  const parentCount = levelQuestions.filter(q => q.category === "ORANG TUA").length
  const studentCount = levelQuestions.filter(q => q.category === "SISWA").length

  const handleDelete = async (id: string) => {
    if (confirm("Hapus pertanyaan ini?")) {
      await deleteQuestion(id)
      router.refresh()
    }
  }

  const handleSync = async () => {
    if (confirm("Sinkronkan seluruh soal SMP? Soal SMP lama (non-sistem) beserta jawaban siswa untuk soal itu akan DIHAPUS dan tidak bisa dikembalikan.")) {
      const res = await fetch("/api/public/seed", { method: "POST" })
      if (res.ok) {
        alert("Berhasil sinkronisasi seluruh soal!")
        router.refresh()
      }
    }
  }

  const closeForm = () => {
    setIsAdding(false)
    setEditingQuestion(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Soal Observasi"
        description="Atur pertanyaan observasi untuk orang tua dan calon siswa per jenjang"
        actions={
          <>
            <Button variant="outline" onClick={handleSync}>
              <RefreshCw size={16} />
              Sync Semua Soal
            </Button>
            <Button variant="outline" onClick={() => setShowQR(true)}>
              <QrCode size={16} />
              QR Soal {activeLevel}
            </Button>
            <Button
              onClick={() => setIsAdding(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus size={16} />
              Tambah Soal
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<Level>
            label="Jenjang"
            value={activeLevel}
            onChange={(level) => {
              setActiveLevel(level)
              if (level === "SD") setActiveCategory("ORANG TUA")
            }}
            options={[
              { value: "SD", label: "Unit SD", count: forLevel("SD").length },
              { value: "SMP", label: "Unit SMP", count: forLevel("SMP").length },
            ]}
          />
          <Segmented<Category>
            label="Target responden"
            value={activeCategory}
            onChange={setActiveCategory}
            options={[
              { value: "ORANG TUA", label: "Orang Tua", count: parentCount },
              {
                value: "SISWA",
                label: "Calon Siswa",
                count: studentCount,
                disabled: activeLevel === "SD",
                disabledHint: "Hanya tersedia untuk Unit SMP",
              },
            ]}
          />
        </div>

        {/* Banner pembeda agar tidak membingungkan admin & pewawancara */}
        {activeLevel === "SD" ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50/80 px-4 py-2.5 text-xs text-orange-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-200 text-orange-800 font-bold">SD</span>
              <span>
                <strong>Soal Observasi Unit SD:</strong> Khusus kuesioner orang tua calon siswa SD. Terpisah sepenuhnya dari soal SMP.
              </span>
            </div>
            <span className="font-semibold text-orange-800">{forLevel("SD").length} Soal Aktif</span>
          </div>
        ) : (
          <div className="rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-2.5 text-xs text-teal-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-200 text-teal-800 font-bold">SMP</span>
              <span>
                <strong>Soal Observasi Unit SMP:</strong> Terdiri dari kuesioner orang tua dan wawancara calon siswa SMP.
              </span>
            </div>
            <span className="font-semibold text-teal-800">{forLevel("SMP").length} Soal Aktif</span>
          </div>
        )}
      </div>

      {/* Question list */}
      {filteredQuestions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={HelpCircle}
            title={`Belum ada pertanyaan untuk Unit ${activeLevel}`}
            description='Klik "Tambah Soal" atau "Sync Semua Soal" untuk mengisi data.'
            action={
              <Button
                onClick={() => setIsAdding(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus size={16} />
                Tambah Soal
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredQuestions.map((q, i) => (
            <li
              key={q.id}
              className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold tabular-nums text-slate-600">
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-relaxed text-slate-900">{q.text}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {q.category === "ORANG TUA" ? "Orang Tua" : "Calon Siswa"}
                  </span>
                  <UnitBadge level={activeLevel} />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {!q.isSystem ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingQuestion(q)}
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
                  </>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200"
                    title="Soal sistem tidak dapat diubah atau dihapus"
                  >
                    <Lock size={12} />
                    Sistem (Permanen)
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add/Edit Dialog */}
      {(isAdding || editingQuestion) && (
        <Dialog
          open={isAdding || !!editingQuestion}
          onOpenChange={(open) => {
            if (!open) closeForm()
          }}
          className="max-w-lg"
        >
          <DialogHeader className="border-b border-slate-100 px-6 py-4">
            <DialogTitle>{isAdding ? "Tambah Soal" : "Edit Soal"}</DialogTitle>
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              aria-label="Tutup"
              title="Tutup"
            >
              <X size={18} />
            </button>
          </DialogHeader>

          <DialogContent className="px-6 pb-6 pt-5">
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
                  level: activeLevel,
                  options: options,
                }

                if (editingQuestion) {
                  await updateQuestion(editingQuestion.id, data)
                } else {
                  await addQuestion(data)
                }

                setLoading(false)
                closeForm()
                router.refresh()
              }}
              className="space-y-4"
            >
              <p className="text-sm text-slate-500">
                Soal ini akan ditambahkan ke Unit {activeLevel}.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="question-category" className={FIELD_LABEL}>Target Responden</label>
                  <select
                    id="question-category"
                    name="category"
                    defaultValue={editingQuestion?.category || activeCategory}
                    required
                    className={cn(FIELD_INPUT, "h-10 cursor-pointer")}
                  >
                    <option value="ORANG TUA">Orang Tua</option>
                    <option value="SISWA">Calon Siswa</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="question-type" className={FIELD_LABEL}>Tipe Jawaban</label>
                  <select
                    name="type"
                    id="question-type"
                    defaultValue={editingQuestion?.type || "long_text"}
                    required
                    onChange={(e) => {
                      const optionsDiv = document.getElementById("options-container");
                      if (optionsDiv) optionsDiv.style.display = e.target.value === "choice" ? "block" : "none";
                    }}
                    className={cn(FIELD_INPUT, "h-10 cursor-pointer")}
                  >
                    <option value="text">Teks Pendek</option>
                    <option value="long_text">Paragraf Panjang</option>
                    <option value="number">Angka</option>
                    <option value="choice">Pilihan (Multiple Choice)</option>
                    <option value="rating">Penilaian (1-5)</option>
                  </select>
                </div>
              </div>

              <div id="options-container" className="space-y-1.5" style={{ display: editingQuestion?.type === "choice" ? "block" : "none" }}>
                <label htmlFor="question-options" className={FIELD_LABEL}>Pilihan Jawaban</label>
                <input
                  id="question-options"
                  name="options"
                  defaultValue={editingQuestion?.options?.join(", ") || ""}
                  placeholder="Contoh: Sanggup, Tidak Sanggup, Ragu-ragu"
                  className={cn(FIELD_INPUT, "h-10")}
                />
                <p className="text-xs text-slate-500">Pisahkan setiap pilihan dengan koma.</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="question-text" className={FIELD_LABEL}>Isi Pertanyaan</label>
                <textarea
                  id="question-text"
                  name="text"
                  defaultValue={editingQuestion?.text || ""}
                  required
                  rows={3}
                  placeholder="Tuliskan pertanyaan observasi..."
                  className={cn(FIELD_INPUT, "resize-none py-2.5 leading-relaxed")}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="question-order" className={FIELD_LABEL}>Nomor Urut</label>
                <input
                  id="question-order"
                  name="order"
                  type="number"
                  defaultValue={editingQuestion?.order || (filteredQuestions.length + 1)}
                  required
                  className={cn(FIELD_INPUT, "h-10 w-28 tabular-nums")}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Simpan Soal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* QR Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR} className="max-w-xs">
        <DialogHeader className="border-b border-slate-100 px-6 py-4">
          <DialogTitle>Akses Soal {activeLevel}</DialogTitle>
          <button
            type="button"
            onClick={() => setShowQR(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            aria-label="Tutup"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </DialogHeader>
        <DialogContent className="px-6 pb-6 pt-5 text-center">
          <div className="mb-4 flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-4">
            {origin && (
              <QRCodeSVG
                value={`https://dashboard-alfakhir.vercel.app/questions/${activeLevel.toLowerCase()}`}
                size={200}
                level="H"
              />
            )}
          </div>

          <p className="mb-5 text-sm leading-relaxed text-slate-500">
            Scan QR ini untuk melihat daftar pertanyaan Unit {activeLevel} di perangkat lain.
          </p>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowQR(false)}
          >
            Tutup
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
