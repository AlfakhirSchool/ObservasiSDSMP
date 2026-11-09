/** Tipe dan logika murni formulir publik (tanpa React) supaya mudah dibaca dan dipakai ulang. */

export type QuestionType = "text" | "long_text" | "number" | "choice" | "rating"

export interface FormQuestion {
  id: string
  text: string
  type: QuestionType
  category: string
  options?: string[]
  /** Judul bagian; kosong = digabung ke bagian umum yang dipecah per beberapa pertanyaan. */
  section?: string | null
  /** Hanya `false` yang berarti opsional (soal lama tidak punya kolom ini dan dianggap wajib). */
  required?: boolean
  hint?: string | null
  showIfId?: string | null
  showIfValue?: string | null
  inputKind?: "tel"
}

export interface FormCandidate {
  id: string
  name: string
  level: string
  selectedInterviewer?: string | null
}

export interface Step {
  id: string
  title: string
  questions: FormQuestion[]
}

export type Answers = Record<string, string>

export const SYS_NAME = "sys_name_corr"
export const SYS_PHONE = "sys_phone"
export const SYS_STEP_TITLE = "Konfirmasi Data"
/** Soal tanpa bagian dipecah per sekian pertanyaan agar tiap langkah terasa ringan. */
const CHUNK = 8

export const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase()
export const isOther = (opt: string) => norm(opt).startsWith("yang lain")

/** Dua isian tetap untuk orang tua: koreksi nama (terisi otomatis) dan telepon aktif. */
export function systemQuestions(candidateName: string): { questions: FormQuestion[]; prefill: Answers } {
  return {
    prefill: { [SYS_NAME]: candidateName },
    questions: [
      {
        id: SYS_NAME,
        text: "Nama Lengkap Ananda",
        hint: "Periksa penulisan nama ananda di atas. Jika nama ananda salah, boleh langsung diperbaiki dengan menulis ulang nama yang benar di kolom ini.",
        type: "text",
        category: "ORANG TUA",
      },
      {
        id: SYS_PHONE,
        text: "Nomor telepon aktif yang bisa dihubungi",
        hint: "Contoh: 0812XXXXXXXX",
        type: "text",
        category: "ORANG TUA",
        inputKind: "tel",
      },
    ],
  }
}

export function buildSteps(questions: FormQuestion[], system: FormQuestion[] | null): Step[] {
  const steps: Step[] = []
  if (system) steps.push({ id: "sys", title: SYS_STEP_TITLE, questions: system })

  const bySection = new Map<string, FormQuestion[]>()
  const plain: FormQuestion[] = []
  for (const q of questions) {
    if (!q.section) {
      plain.push(q)
      continue
    }
    const list = bySection.get(q.section) ?? []
    list.push(q)
    bySection.set(q.section, list)
  }
  for (const [title, list] of bySection) steps.push({ id: `s:${title}`, title, questions: list })

  if (plain.length > 0) {
    const parts = Math.ceil(plain.length / CHUNK)
    for (let i = 0; i < parts; i++) {
      steps.push({
        id: `p:${i}`,
        title: parts === 1 ? "Pertanyaan" : `Pertanyaan ${i + 1} dari ${parts}`,
        questions: plain.slice(i * CHUNK, (i + 1) * CHUNK),
      })
    }
  }
  return steps
}

/** Pertanyaan bersyarat tampil bila jawaban pertanyaan induknya cocok; induk hilang = selalu tampil. */
export function isVisible(q: FormQuestion, answers: Answers, byId: Map<string, FormQuestion>, depth = 0): boolean {
  if (!q.showIfId || depth > 5) return true
  const parent = byId.get(q.showIfId)
  if (!parent) return true
  return isVisible(parent, answers, byId, depth + 1) && norm(answers[q.showIfId]) === norm(q.showIfValue)
}

export const isMissing = (q: FormQuestion, answers: Answers) => q.required !== false && !(answers[q.id] ?? "").trim()

export function readDraft(key: string): { answers: Answers; step: number } | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return null
    const { answers, step } = parsed as { answers?: unknown; step?: unknown }
    if (typeof answers !== "object" || answers === null) return null
    const clean: Answers = {}
    for (const [k, v] of Object.entries(answers)) if (typeof v === "string") clean[k] = v
    return { answers: clean, step: typeof step === "number" && step >= 0 ? Math.floor(step) : 0 }
  } catch {
    return null
  }
}
