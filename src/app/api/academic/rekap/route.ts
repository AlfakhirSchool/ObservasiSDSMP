import { auth } from "@/lib/auth"
import { getRekapAkademikSmp } from "@/lib/rekap-akademik"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  const user = session?.user
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = user.role as string
  if (role !== "interviewer" && !role.startsWith("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const rows = await getRekapAkademikSmp()
    return NextResponse.json({ rows })
  } catch (err) {
    console.error("[GET /api/academic/rekap]", err)
    return NextResponse.json(
      { error: "Gagal memuat rekap akademik. Periksa koneksi database/jaringan." },
      { status: 500 }
    )
  }
}
