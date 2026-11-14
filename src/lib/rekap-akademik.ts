import { prisma } from "@/lib/prisma"

export interface SubjectScoreDetail {
  total: number
  correct: number
  percent: number
}

export interface RekapAkademikSmpRow {
  id: string
  nama: string
  asalSekolah: string
  guru: string
  gelombang: number
  academicYear: string | null
  sudahUjian: boolean
  totalScore: number | null
  grade: string | null
  predikat: string | null
  subjectScores: Record<string, SubjectScoreDetail>
  tanggalUjian: string | null
  keputusan: string | null
}

export const SMP_AKADEMIK_MAPEL = [
  "Bahasa Indonesia",
  "Matematika",
  "Bahasa Inggris",
  "Agama Islam",
  "IPA",
] as const

export function parseSubjectScores(raw: string | null | undefined): Record<string, SubjectScoreDetail> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, { total?: number; correct?: number }>
    const result: Record<string, SubjectScoreDetail> = {}
    for (const [key, val] of Object.entries(parsed)) {
      const total = Number(val.total ?? 0)
      const correct = Number(val.correct ?? 0)
      const percent = total > 0 ? Math.round((correct / total) * 100) : 0
      result[key] = { total, correct, percent }
    }
    return result
  } catch {
    return {}
  }
}

export function getGradeAkademik(score: number | null): { grade: string; label: string } {
  if (score === null) return { grade: "-", label: "Belum Ujian" }
  if (score >= 86) return { grade: "A", label: "Sangat Baik" }
  if (score >= 71) return { grade: "B", label: "Baik" }
  if (score >= 56) return { grade: "C", label: "Cukup" }
  return { grade: "D", label: "Perlu Bimbingan" }
}

/** Ambil rekap data hasil tes akademik untuk seluruh calon siswa SMP. */
export async function getRekapAkademikSmp(): Promise<RekapAkademikSmpRow[]> {
  const candidates = await prisma.candidate.findMany({
    where: { level: "SMP" },
    select: {
      id: true,
      name: true,
      correctedName: true,
      originSchool: true,
      selectedInterviewer: true,
      gelombang: true,
      academicYear: true,
      academicTestResult: {
        select: {
          totalScore: true,
          subjectScores: true,
          createdAt: true,
        },
      },
      notes: { select: { recommendation: true }, take: 1 },
    },
    orderBy: { name: "asc" },
  })

  return candidates.map((c) => {
    const testResult = c.academicTestResult
    const hasTest = testResult !== null
    const totalScore = testResult ? testResult.totalScore : null
    const { grade, label } = getGradeAkademik(totalScore)
    const subjectScores = testResult ? parseSubjectScores(testResult.subjectScores) : {}

    return {
      id: c.id,
      nama: c.correctedName || c.name,
      asalSekolah: c.originSchool ?? "",
      guru: c.selectedInterviewer ?? "",
      gelombang: c.gelombang,
      academicYear: c.academicYear,
      sudahUjian: hasTest,
      totalScore,
      grade: hasTest ? grade : null,
      predikat: hasTest ? label : null,
      subjectScores,
      tanggalUjian: testResult ? testResult.createdAt.toISOString() : null,
      keputusan: c.notes[0]?.recommendation ?? null,
    }
  })
}
