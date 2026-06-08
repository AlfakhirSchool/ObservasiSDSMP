import { auth } from "@/lib/auth"
import { getCandidates } from "@/lib/data-service"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const level = searchParams.get("level") || undefined
  
  // If interviewer, only show their candidates
  const interviewerEmail = session.user.role === "interviewer" ? session.user.email || undefined : undefined

  try {
    const candidates = await getCandidates(interviewerEmail, level)
    return NextResponse.json(candidates)
  } catch (error) {
    console.error("[GET /api/candidates]", error)
    return NextResponse.json({ error: "Gagal memuat data kandidat" }, { status: 500 })
  }
}
