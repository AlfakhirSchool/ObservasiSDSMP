import { prisma } from "@/lib/prisma"

export type RekapJenjang = "SD" | "SMP"
export type RekapKategori = "ORANG TUA" | "SISWA"

export interface RekapFormQuestion {
  id: string
  text: string
  /** Wajib dan tidak bersyarat. */
  wajib: boolean
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
  /** Berapa pertanyaan wajib (tidak bersyarat) yang sudah dijawab. */
  wajibTerjawab: number
}

export interface RekapFormData {
  questions: RekapFormQuestion[]
  rows: RekapFormRow[]
  /** Jumlah pertanyaan wajib yang tidak bersyarat; patokan status "Lengkap". */
  wajibTotal: number
}

const normalisasi = (s: string) => s.trim().toUpperCase()

/**
 * Jawaban formulir semua siswa suatu jenjang, per kategori (orang tua atau siswa): satu baris per siswa, satu
 * kolom per pertanyaan. Pewawancara dan admin sama-sama boleh melihat semua siswa.
 */
export async function getRekapForm(jenjang: RekapJenjang, kategori: RekapKategori): Promise<RekapFormData> {
  const [allQuestions, candidates] = await Promise.all([
    prisma.formQuestion.findMany({
      where: { level: jenjang },
      orderBy: { order: "asc" },
      select: { id: true, text: true, category: true, required: true, showIfId: true },
    }),
    prisma.candidate.findMany({
      where: { level: jenjang },
      select: { id: true, name: true, correctedName: true, selectedInterviewer: true, gelombang: true, academicYear: true },
      orderBy: { name: "asc" },
    }),
  ])

  const questions = allQuestions
    .filter((q) => normalisasi(q.category) === kategori)
    // Pertanyaan bersyarat atau opsional tidak dihitung sebagai syarat "lengkap": tidak semua orang tua melihatnya.
    .map(({ id, text, required, showIfId }) => ({ id, text, wajib: required && !showIfId }))
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

  const wajib = questions.filter((q) => q.wajib)
  return {
    questions,
    wajibTotal: wajib.length,
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
        wajibTerjawab: wajib.filter((q) => jawaban[q.id] !== undefined).length,
      }
    }),
  }
}
