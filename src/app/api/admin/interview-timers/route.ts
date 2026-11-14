import { auth } from "@/lib/auth"
import { getAdminTimers } from "@/lib/interview-timer-server"
import { Level } from "@prisma/client"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  const role = session?.user?.role
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!role.startsWith("admin")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const level = role === "admin_sd" ? Level.SD : role === "admin_smp" ? Level.SMP : undefined
    return NextResponse.json(await getAdminTimers(level), { headers: { "Cache-Control": "no-store" } })
  } catch (err) {
    console.error("[GET /api/admin/interview-timers]", err)
    return NextResponse.json({ error: "Gagal memuat timer" }, { status: 500 })
  }
}
