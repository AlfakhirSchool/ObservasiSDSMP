import type { Level } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { isMissing, isVisible, type FormQuestion } from "@/app/form/[id]/form-logic"

/**
 * Teks pertanyaan wajib formulir orang tua yang belum dijawab siswa ini, urut seperti di formulir.
 * Pertanyaan bersyarat hanya dihitung bila memang tampil untuk jawaban yang sudah diisi (aturan sama dengan formulir publik).
 */
export async function missingParentFormQuestions(candidateId: string, level: Level): Promise<string[]> {
  const [rows, answerRows] = await Promise.all([
    prisma.formQuestion.findMany({
      where: { OR: [{ level }, { level: null }], category: "ORANG TUA" },
      orderBy: { order: "asc" },
      select: { id: true, text: true, category: true, required: true, showIfId: true, showIfValue: true },
    }),
    prisma.formAnswer.findMany({ where: { candidateId }, select: { questionId: true, value: true } }),
  ])

  const questions: FormQuestion[] = rows.map((q) => ({ ...q, type: "text" }))
  const byId = new Map(questions.map((q) => [q.id, q]))
  const answers = Object.fromEntries(answerRows.map((a) => [a.questionId, a.value]))

  return questions.filter((q) => isVisible(q, answers, byId) && isMissing(q, answers)).map((q) => q.text)
}
