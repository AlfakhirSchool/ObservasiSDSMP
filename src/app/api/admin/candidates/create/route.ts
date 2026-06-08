import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user?.role?.startsWith("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, level, room } = await req.json()

    if (!name || !level) {
      return NextResponse.json({ error: "Nama dan Jenjang wajib diisi" }, { status: 400 })
    }

    const candidate = await prisma.candidate.create({
      data: {
        name,
        level: level as "SD" | "SMP",
        room: room || null,
        status: "PENDING",
      },
    })

    return NextResponse.json(candidate)
  } catch (error) {
    console.error("[CANDIDATE_CREATE]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
