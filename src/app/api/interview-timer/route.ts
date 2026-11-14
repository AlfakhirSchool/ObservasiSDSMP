import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { allow } from "@/lib/rate-limit"
import { TIMER_MAX_SEC, hasInterviewTimer } from "@/lib/interview-timer"
import { PURGE_AFTER_MS } from "@/lib/interview-timer-server"
import { NextResponse } from "next/server"
import { z } from "zod"

// Sinkron status timer pewawancara ke server agar admin bisa memantau. Klien mengirim SELURUH status timer miliknya
// (idempoten): entri yang tidak ada lagi di daftar dihapus. Identitas pewawancara dan nama siswa selalu diambil dari
// sesi/database, tidak pernah dari klien. Waktu mulai memakai jam server agar tidak terpengaruh jam perangkat.
const BodySchema = z.object({
  entries: z
    .array(
      z.object({
        candidateId: z.string().min(1).max(64),
        running: z.boolean(),
        elapsedMs: z.number().int().min(0).max(TIMER_MAX_SEC * 1000),
      }),
    )
    .max(50),
})

export async function PUT(req: Request) {
  const session = await auth()
  const user = session?.user
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "interviewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { username: true, name: true } })
  if (!account || !hasInterviewTimer(account.username)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (!(await allow(`interview-timer:${user.id}`, 300, 600))) {
    return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429 })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 })

  const byId = new Map(parsed.data.entries.map((e) => [e.candidateId, e]))
  const [found, lockedNotes] = await Promise.all([
    prisma.candidate.findMany({
      where: { id: { in: [...byId.keys()] } },
      select: { id: true, name: true, correctedName: true, level: true },
    }),
    prisma.interviewerNote.findMany({
      where: { candidateId: { in: [...byId.keys()] }, isLocked: true },
      select: { candidateId: true },
    }),
  ])
  // Siswa yang catatannya sudah dikirim dan dikunci dianggap selesai: timernya tidak disimpan di server dan klien
  // diminta menghapusnya dari daftar lokal (balasan `done`).
  const doneIds = new Set(lockedNotes.map((n) => n.candidateId))
  const candidates = found.filter((c) => !doneIds.has(c.id))

  const now = new Date()
  const interviewerName = account.name ?? account.username ?? "Pewawancara"
  try {
    await prisma.$transaction([
      prisma.interviewTimer.deleteMany({
        where: {
          OR: [
            { interviewerId: user.id, candidateId: { notIn: candidates.map((c) => c.id) } },
            { updatedAt: { lt: new Date(now.getTime() - PURGE_AFTER_MS) } },
          ],
        },
      }),
      ...candidates.map((c) => {
        const e = byId.get(c.id)!
        const data = {
          interviewerName,
          candidateName: c.correctedName || c.name,
          level: c.level,
          startedAt: e.running ? now : null,
          elapsedMs: e.elapsedMs,
        }
        return prisma.interviewTimer.upsert({
          where: { interviewerId_candidateId: { interviewerId: user.id, candidateId: c.id } },
          create: { interviewerId: user.id, candidateId: c.id, ...data },
          update: data,
        })
      }),
    ])
  } catch (err) {
    console.error("[PUT /api/interview-timer]", err)
    return NextResponse.json({ error: "Gagal menyinkronkan timer" }, { status: 500 })
  }
  return NextResponse.json({ ok: true, done: [...doneIds] })
}
