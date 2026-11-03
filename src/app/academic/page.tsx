import { prisma } from "@/lib/prisma"
import AcademicPortalClient from "./AcademicPortalClient"

export const dynamic = "force-dynamic"

export default async function AcademicPortalPage() {
  // Ambil tahun ajaran terbaru untuk SMP secara dinamis (misal "2027/2028")
  const latestSMP = await (prisma as any).candidate.findFirst({
    where: {
      level: "SMP",
      academicYear: { not: null }
    },
    orderBy: {
      academicYear: "desc"
    },
    select: {
      academicYear: true
    }
  })

  const activeYear = latestSMP?.academicYear || "2027/2028"

  // Hanya ambil calon siswa SMP dari tahun ajaran terbaru yang belum selesai ujian (aktif)
  const candidates = await (prisma as any).candidate.findMany({
    where: {
      level: "SMP",
      academicYear: activeYear,
      academicTestResult: null,
      status: { notIn: ["REVIEWED", "COMPLETED"] }
    },
    orderBy: {
      name: "asc"
    }
  })

  return <AcademicPortalClient candidates={candidates} academicYear={activeYear} />
}
