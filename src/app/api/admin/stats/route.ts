import { auth } from "@/lib/auth"
import { getDashboardStats } from "@/lib/data-service"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  const role = session?.user?.role as string
  
  if (!role || !role.startsWith("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const level = searchParams.get("level") || undefined
    const stats = await getDashboardStats(level)
    return NextResponse.json(stats)
  } catch (error) {
    console.error("[GET /api/admin/stats]", error)
    return NextResponse.json({ error: "Gagal memuat statistik" }, { status: 500 })
  }
}
