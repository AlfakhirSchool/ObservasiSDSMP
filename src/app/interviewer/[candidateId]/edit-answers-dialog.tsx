"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { AlertCircle, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { answerError } from "@/lib/form-validation"
import { getAnswerEditData, saveAnswers, type AnswerEditData } from "@/lib/answer-actions"
import { QuestionField } from "@/app/form/[id]/form-fields"
import { ACCENT } from "@/app/form/[id]/form-theme"
import { isMissing, isVisible, type FormQuestion } from "@/app/form/[id]/form-logic"

type Category = "ORANG TUA" | "SISWA"

const QUESTION_TYPES: readonly FormQuestion["type"][] = ["text", "long_text", "number", "choice", "rating"]

interface Props {
  candidateId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Dipanggil setelah jawaban tersimpan, mis. untuk menyegarkan halaman. */
  onSaved: () => void
}

export function EditAnswersDialog({ candidateId, open, onOpenChange, onSaved }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-3xl">
      <Editor candidateId={candidateId} onClose={() => onOpenChange(false)} onSaved={onSaved} />
    </Dialog>
  )
}

function Editor({ candidateId, onClose, onSaved }: { candidateId: string; onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState<AnswerEditData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [category, setCategory] = useState<Category>("ORANG TUA")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let batal = false
    getAnswerEditData(candidateId)
      .then((d) => {
        if (batal) return
        setData(d)
        setValues(d.values)
      })
      .catch(() => {
        if (!batal) setLoadError("Gagal memuat jawaban. Pastikan Anda masuk sebagai admin.")
      })
    return () => {
      batal = true
    }
  }, [candidateId])

  const questions: FormQuestion[] = useMemo(
    () =>
      (data?.questions ?? []).map((q) => ({
        id: q.id,
        text: q.text,
        type: QUESTION_TYPES.find((t) => t === q.type) ?? "text",
        category: q.category,
        options: q.options,
        section: q.section,
        required: q.required,
        hint: q.hint,
        showIfId: q.showIfId,
        showIfValue: q.showIfValue,
      })),
    [data]
  )
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const categories = useMemo(
    () => (["ORANG TUA", "SISWA"] as const).filter((c) => questions.some((q) => q.category === c)),
    [questions]
  )
  const activeCategory = categories.includes(category) ? category : (categories[0] ?? category)
  const visible = questions.filter((q) => q.category === activeCategory && isVisible(q, values, byId))

  const requiredVisible = visible.filter((q) => q.required !== false)
  const answeredRequired = requiredVisible.filter((q) => !isMissing(q, values)).length

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      // Hanya pertanyaan yang tampil yang dikirim: jawaban sisa dari pertanyaan bersyarat yang tersembunyi dibuang.
      const payload = Object.fromEntries(visible.map((q) => [q.id, values[q.id] ?? ""]))
      const res = await saveAnswers({ candidateId, category: activeCategory, values: payload })
      if (!res.ok) {
        setSaveError(res.error)
        return
      }
      toast.success(`${res.saved} jawaban tersimpan`)
      onSaved()
      onClose()
    } catch {
      setSaveError("Gagal menyimpan. Coba lagi.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit jawaban formulir</DialogTitle>
        <DialogDescription>
          {data ? `${data.name} · ` : ""}
          Lengkapi atau perbaiki jawaban atas nama orang tua/siswa. Perubahan dicatat di riwayat aktivitas.
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        {loadError ? (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {loadError}
          </p>
        ) : !data ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" aria-label="Memuat jawaban" />
          </div>
        ) : (
          <div className="space-y-4">
            {categories.length > 1 && (
              <div role="tablist" aria-label="Kategori jawaban" className="inline-flex rounded-xl bg-slate-100 p-1">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                      activeCategory === c ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {c === "ORANG TUA" ? "Orang tua" : "Siswa"}
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-500">
              {answeredRequired} dari {requiredVisible.length} pertanyaan wajib terisi
            </p>

            <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
              {visible.map((q, i) => {
                const error = answerError(q.text, values[q.id] ?? "")
                const kosong = isMissing(q, values)
                const bagianBaru = q.section && q.section !== visible[i - 1]?.section
                return (
                  <div key={q.id}>
                    {bagianBaru && <h3 className="pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-slate-400">{q.section}</h3>}
                    <div className={cn("space-y-2 rounded-xl border bg-white p-3", error ? "border-red-300" : kosong ? "border-amber-300" : "border-slate-200")}>
                      <label htmlFor={`f-${q.id}`} className="block text-sm font-semibold text-slate-900">
                        {i + 1}. {q.text}
                        {q.required === false && <span className="ml-2 text-xs font-medium text-slate-400">(opsional)</span>}
                      </label>
                      {q.hint && <p className="text-xs text-slate-500">{q.hint}</p>}
                      <QuestionField
                        q={q}
                        value={values[q.id] ?? ""}
                        onChange={(v) => setValues((prev) => ({ ...prev, [q.id]: v }))}
                        accent={ACCENT[data.level]}
                      />
                      {error && (
                        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                          <AlertCircle className="h-4 w-4" aria-hidden="true" />
                          {error}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {saveError && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {saveError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Simpan jawaban
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </>
  )
}
