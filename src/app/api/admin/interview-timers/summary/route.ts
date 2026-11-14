import { auth } from "@/lib/auth"
import { getTimerSummary, type SummaryScope } from "@/lib/interview-timer-server"
import { Level } from "@prisma/client"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  const role = session?.user?.role
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!role.startsWith("admin")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const scope: SummaryScope = new URL(req.url).searchParams.get("scope") === "all" ? "all" : "today"
  try {
    const level = role === "admin_sd" ? Level.SD : role === "admin_smp" ? Level.SMP : undefined
    return NextResponse.json(await getTimerSummary(scope, level), { headers: { "Cache-Control": "no-store" } })
  } catch (err) {
    console.error("[GET /api/admin/interview-timers/summary]", err)
    return NextResponse.json({ error: "Gagal memuat rekap" }, { status: 500 })
  }
}
