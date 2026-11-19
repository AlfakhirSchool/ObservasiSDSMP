"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canWriteObservation, isAdminRole } from "@/lib/permissions"
import { logActivity } from "@/lib/activity-log"
import { answerError } from "@/lib/form-validation"

/**
 * Admin selalu boleh. Pewawancara boleh melengkapi jawaban siswanya sendiri (SD: semua siswa) selama catatannya belum
 * terkunci. Server action adalah endpoint POST publik, jadi pengecekan ini HARUS di sini.
 */
async function assertCanEditAnswers(candidateId: string) {
  const session = await auth()
  if (!session) throw new Error("Forbidden")
  const { role, username, name } = session.user
  if (isAdminRole(role)) return session
  if (role !== "interviewer" || !canWriteObservation(role, username)) throw new Error("Forbidden")
  const c = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { level: true, selectedInterviewer: true, notes: { select: { isLocked: true } } },
  })
  if (!c || c.notes.some((n) => n.isLocked) || (c.level !== "SD" && c.selectedInterviewer !== name)) throw new Error("Forbidden")
  return session
}

export interface AnswerEditQuestion {
  id: string
  text: string
  type: string
  category: string
  options: string[]
  section: string | null
  required: boolean
  hint: string | null
  showIfId: string | null
  showIfValue: string | null
}

export interface AnswerEditData {
  name: string
  level: "SD" | "SMP"
  questions: AnswerEditQuestion[]
  /** Jawaban tersimpan per id pertanyaan. */
  values: Record<string, string>
}

export type SaveAnswersResult = { ok: true; saved: number } | { ok: false; error: string }

const SaveInput = z.object({
  candidateId: z.string().min(1).max(64),
  category: z.enum(["ORANG TUA", "SISWA"]),
  values: z.record(z.string().max(64), z.string().max(5000)),
})

function parseOptions(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((o): o is string => typeof o === "string") : []
  } catch {
    return []
  }
}

/** Semua pertanyaan untuk jenjang siswa beserta jawaban yang tersimpan, agar admin bisa melengkapi yang kosong. */
export async function getAnswerEditData(candidateId: string): Promise<AnswerEditData> {
  await assertCanEditAnswers(candidateId)
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { name: true, level: true, formAnswers: { select: { questionId: true, value: true } } },
  })
  if (!candidate) throw new Error("Siswa tidak ditemukan")

  const questions = await prisma.formQuestion.findMany({
    where: { OR: [{ level: candidate.level }, { level: null }] },
    orderBy: { order: "asc" },
  })

  return {
    name: candidate.name,
    level: candidate.level,
    questions: questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      category: q.category.trim().toUpperCase(),
      options: parseOptions(q.options),
      section: q.section,
      required: q.required,
      hint: q.hint,
      showIfId: q.showIfId,
      showIfValue: q.showIfValue,
    })),
    values: Object.fromEntries(candidate.formAnswers.map((a) => [a.questionId, a.value])),
  }
}

/**
 * Simpan jawaban satu kategori (orang tua atau siswa) menggantikan yang lama. Hanya admin; berlaku juga untuk siswa yang
 * catatannya sudah terkunci. Menolak simpan tanpa satu pun jawaban supaya jawaban lama tidak terhapus tak sengaja.
 */
export async function saveAnswers(input: z.input<typeof SaveInput>): Promise<SaveAnswersResult> {
  const parsed = SaveInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Data tidak valid" }
  const { candidateId, category, values } = parsed.data
  const session = await assertCanEditAnswers(candidateId)

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId }, select: { name: true, level: true, status: true } })
  if (!candidate) return { ok: false, error: "Siswa tidak ditemukan" }

  const questions = await prisma.formQuestion.findMany({
    where: { category, OR: [{ level: candidate.level }, { level: null }] },
    select: { id: true, text: true },
  })

  const entries = questions.flatMap((q) => {
    const value = (values[q.id] ?? "").trim()
    return value ? [{ questionId: q.id, text: q.text, value }] : []
  })
  if (entries.length === 0) return { ok: false, error: "Tidak ada jawaban yang diisi. Jawaban lama tidak diubah." }

  for (const e of entries) {
    const error = answerError(e.text, e.value)
    if (error) return { ok: false, error: `${e.text} — ${error}` }
  }

  await prisma.$transaction([
    prisma.formAnswer.deleteMany({ where: { candidateId, questionId: { in: questions.map((q) => q.id) } } }),
    prisma.formAnswer.createMany({ data: entries.map(({ questionId, value }) => ({ candidateId, questionId, value })) }),
    ...(candidate.status === "PENDING"
      ? [prisma.candidate.update({ where: { id: candidateId }, data: { status: "RESPONSE_RECEIVED" } })]
      : []),
  ])

  await logActivity({
    action: "FORM_UBAH_ADMIN",
    targetType: "siswa",
    targetId: candidateId,
    targetLabel: candidate.name,
    detail: `${entries.length} jawaban (${category}) disimpan oleh ${isAdminRole(session.user.role) ? "admin" : "pewawancara"}`,
  })

  for (const path of [`/admin/candidates/${candidateId}`, `/interviewer/${candidateId}`, "/interviewer/rekap", "/admin/rekap"]) {
    revalidatePath(path)
  }
  return { ok: true, saved: entries.length }
}
