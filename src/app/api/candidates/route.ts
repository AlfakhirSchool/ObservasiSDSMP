import { canViewMonitoring } from "@/lib/permissions"
import { auth } from "@/lib/auth"
import { getCandidates } from "@/lib/data-service"
import { NextResponse } from "next/server"

// Memuat data lengkap siswa (no. HP, NIM, nilai) untuk daftar admin, jadi khusus admin.
export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!canViewMonitoring(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const level = new URL(request.url).searchParams.get("level") || undefined

  try {
    return NextResponse.json(await getCandidates(undefined, level))
  } catch (error) {
    console.error("[GET /api/candidates]", error)
    return NextResponse.json({ error: "Gagal memuat data kandidat" }, { status: 500 })
  }
}
