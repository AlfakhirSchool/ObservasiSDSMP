import { prisma } from "@/lib/prisma"

export type RekapJenjang = "SD" | "SMP"
export type RekapKategori = "ORANG TUA" | "SISWA"

export interface RekapFormQuestion {
  id: string
  text: string
}

/** Jawaban formulir satu siswa. Sengaja tanpa NIM, nomor HP, atau email. */
export interface RekapFormRow {
  id: string
  nama: string
  /** Nama pewawancara yang ditugaskan; kosong bila belum ada. */
  guru: string
  gelombang: number
  academicYear: string | null
  /** Jawaban per id pertanyaan; pertanyaan yang belum dijawab tidak ada di sini. */
  jawaban: Record<string, string>
  terjawab: number
}

export interface RekapFormData {
  questions: RekapFormQuestion[]
  rows: RekapFormRow[]
}

const normalisasi = (s: string) => s.trim().toUpperCase()

/**
 * Jawaban formulir semua siswa suatu jenjang, per kategori (orang tua atau siswa): satu baris per siswa, satu
 * kolom per pertanyaan. Pewawancara dan admin sama-sama boleh melihat semua siswa.
 */
export async function getRekapForm(jenjang: RekapJenjang, kategori: RekapKategori): Promise<RekapFormData> {
  const [allQuestions, candidates] = await Promise.all([
    prisma.formQuestion.findMany({ where: { level: jenjang }, orderBy: { order: "asc" }, select: { id: true, text: true, category: true } }),
    prisma.candidate.findMany({
      where: { level: jenjang },
      select: { id: true, name: true, correctedName: true, selectedInterviewer: true, gelombang: true, academicYear: true },
      orderBy: { name: "asc" },
    }),
  ])

  const questions = allQuestions.filter((q) => normalisasi(q.category) === kategori).map(({ id, text }) => ({ id, text }))
  const answers =
    questions.length === 0
      ? []
      : await prisma.formAnswer.findMany({
          where: { candidate: { level: jenjang }, questionId: { in: questions.map((q) => q.id) } },
          select: { candidateId: true, questionId: true, value: true },
        })

  const byCandidate = new Map<string, Record<string, string>>()
  for (const a of answers) {
    const value = a.value.trim()
    if (!value) continue
    const map = byCandidate.get(a.candidateId) ?? {}
    map[a.questionId] = value
    byCandidate.set(a.candidateId, map)
  }

  return {
    questions,
    rows: candidates.map((c) => {
      const jawaban = byCandidate.get(c.id) ?? {}
      return {
        id: c.id,
        nama: c.correctedName || c.name,
        guru: c.selectedInterviewer ?? "",
        gelombang: c.gelombang,
        academicYear: c.academicYear,
        jawaban,
        terjawab: Object.keys(jawaban).length,
      }
    }),
  }
}
