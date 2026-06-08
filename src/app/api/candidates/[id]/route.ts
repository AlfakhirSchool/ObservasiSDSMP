import { auth } from "@/lib/auth"
import { getCandidateById } from "@/lib/google-sheets"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const candidate = await getCandidateById(id)

  if (!candidate) {
    return NextResponse.json({ error: "Kandidat tidak ditemukan" }, { status: 404 })
  }

  // Interviewer can only see their own candidates
  if (
    session.user.role === "interviewer" &&
    candidate.interviewerEmail !== session.user.email
  ) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  return NextResponse.json(candidate)
}
