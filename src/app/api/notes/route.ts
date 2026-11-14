import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-log"
import { NextResponse } from "next/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

const text = (message: string) => z.string().trim().min(1, message).max(5000, "Teks terlalu panjang (maks 5000 karakter)")

const NoteSchema = z.object({
  candidateId: z.string().min(1),
  observation: text("Catatan observasi wajib diisi"),
  academicAssessment: text("Penilaian akademik wajib diisi"),
  familySupport: text("Catatan keluarga wajib diisi"),
  characterNotes: text("Catatan karakter wajib diisi"),
  otherNotes: z.string().trim().max(5000, "Teks terlalu panjang (maks 5000 karakter)").optional(),
  recommendation: z.enum(["Terima", "Pertimbangkan", "Tolak"]),
  aiSummary: z.string().optional(),
})

class NoteLockedError extends Error {}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  if (role !== "interviewer" && !role.startsWith("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const validated = NoteSchema.parse(await request.json())

    const candidate = await prisma.candidate.findUnique({
      where: { id: validated.candidateId },
      select: { id: true, name: true, level: true, selectedInterviewer: true, notes: { select: { id: true, isLocked: true } } },
    })

    if (!candidate) {
      return NextResponse.json({ error: "Kandidat tidak ditemukan" }, { status: 404 })
    }

    // Pewawancara hanya boleh mengisi catatan untuk siswa yang ditugaskan kepadanya (kecuali SD yang dipegang bersama semua observer).
    if (role === "interviewer" && candidate.level !== "SD" && candidate.selectedInterviewer !== session.user.name) {
      return NextResponse.json({ error: "Siswa ini bukan tanggung jawab Anda" }, { status: 403 })
    }

    if (candidate.notes.some((n) => n.isLocked)) {
      return NextResponse.json({ error: "Catatan sudah dikirim dan tidak dapat diubah" }, { status: 409 })
    }

    // Catatan + status dalam satu transaksi. Batas unik candidateId di database menolak catatan ganda
    // jika dua permintaan masuk bersamaan. Catatan yang dibuka kuncinya oleh admin diperbarui (bukan dibuat baru);
    // updateMany dengan syarat isLocked=false menolak simpan ganda yang bersamaan.
    const existing = candidate.notes[0] ?? null
    const noteData = {
      interviewerName: session.user.name || session.user.email || "",
      interviewerEmail: session.user.email || "",
      observation: validated.observation,
      academicAssessment: validated.academicAssessment,
      familySupport: validated.familySupport,
      characterNotes: validated.characterNotes,
      otherNotes: validated.otherNotes || "",
      recommendation: validated.recommendation,
      isLocked: true,
    }
    const note = await prisma.$transaction(async (tx) => {
      let saved
      if (existing) {
        const updated = await tx.interviewerNote.updateMany({ where: { id: existing.id, isLocked: false }, data: noteData })
        if (updated.count === 0) throw new NoteLockedError()
        saved = await tx.interviewerNote.findUniqueOrThrow({ where: { id: existing.id } })
      } else {
        saved = await tx.interviewerNote.create({ data: { candidateId: validated.candidateId, ...noteData } })
      }
      await tx.candidate.update({ where: { id: validated.candidateId }, data: { status: "REVIEWED" } })
      return saved
    })

    await logActivity({
      action: "CATATAN_KIRIM",
      targetType: "siswa",
      targetId: candidate.id,
      targetLabel: candidate.name,
      detail: `Rekomendasi: ${validated.recommendation}${existing ? " (diisi ulang setelah dibuka admin)" : ""}`,
    })

    revalidatePath("/interviewer")
    revalidatePath(`/interviewer/${validated.candidateId}`)
    revalidatePath("/admin/candidates")

    return NextResponse.json(note)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validasi gagal", details: error.issues }, { status: 422 })
    }
    if (error instanceof NoteLockedError) {
      return NextResponse.json({ error: "Catatan sudah dikirim dan tidak dapat diubah" }, { status: 409 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Catatan sudah dikirim dan tidak dapat diubah" }, { status: 409 })
    }
    console.error("[POST /api/notes]", error)
    return NextResponse.json({ error: "Gagal menyimpan catatan" }, { status: 500 })
  }
}
