import { prisma } from "@/lib/prisma"
import AcademicPortalClient from "./AcademicPortalClient"

export const dynamic = "force-dynamic"

export default async function AcademicPortalPage() {
  // Fetch all SMP candidates
  const candidates = await (prisma as any).candidate.findMany({
    where: {
      level: "SMP"
    },
    include: {
      academicTestResult: true
    },
    orderBy: {
      name: "asc"
    }
  })

  return <AcademicPortalClient candidates={candidates} />
}
