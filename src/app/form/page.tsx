import { prisma } from "@/lib/prisma"
import FormPortalClient from "./form-portal-client"

export const dynamic = "force-dynamic"

export default async function FormPortalPage() {
  // Ambil tahun ajaran terbaru (hanya observasi baru aktif)
  const latestCandidate = await prisma.candidate.findFirst({
    where: { academicYear: { not: null } },
    orderBy: { academicYear: "desc" },
    select: { academicYear: true }
  })
  const activeYear = latestCandidate?.academicYear || "2027/2028"

  const candidates = await prisma.candidate.findMany({
    where: {
      status: { notIn: ["REVIEWED", "COMPLETED"] },
      academicYear: activeYear
    },
    select: {
      id: true,
      name: true,
      level: true,
      room: true,
      status: true,
      formAnswers: {
        select: {
          question: {
            select: {
              category: true
            }
          }
        }
      }
    }
  })

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden flex flex-col items-center justify-center py-12 px-4">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/10 rounded-full blur-[120px] animate-pulse" />
      
      <div className="max-w-md w-full relative z-10">
        <FormPortalClient candidates={candidates} />
      </div>
    </div>
  )
}
