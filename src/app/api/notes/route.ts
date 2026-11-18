import { canWriteObservation } from "@/lib/permissions"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-log"
import { NextResponse } from "next/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { interviewSecondsFromRow } from "@/lib/interview-timer-server"

const longText = z.string().trim().max(5000, "Teks terlalu panjang (maks 5000 karakter)")

// Draf (lock=false) boleh belum lengkap; kunci (lock=true) mewajibkan semua kolom utama + rekomendasi.
const NoteSchema = z
  .object({
    candidateId: z.string().min(1),
    observation: longText,
    academicAssessment: longText,
    familySupport: longText,
    characterNotes: longText,
    otherNotes: longText.optional(),
    recommendation: z.enum(["Terima", "Pertimbangkan", "Tolak", ""]),
    recommendationReason: longText.optional(),
    aiSummary: z.string().optional(),
    lock: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (!v.lock) return
    const required = {
      observation: "Catatan observasi wajib diisi",
      academicAssessment: "Penilaian akademik wajib diisi",
      familySupport: "Catatan keluarga wajib diisi",
      characterNotes: "Catatan karakter wajib diisi",
      recommendation: "Rekomendasi wajib dipilih",
    } as const
    for (const [key, message] of Object.entries(required)) {
      if (!v[key as keyof typeof required]) ctx.addIssue({ code: "custom", path: [key], message })
    }
    if ((v.recommendation === "Pertimbangkan" || v.recommendation === "Tolak") && !v.recommendationReason) {
      ctx.addIssue({ code: "custom", path: ["recommendationReason"], message: `Alasan ${v.recommendation === "Tolak" ? "ditolak" : "dipertimbangkan"} wajib diisi` })
    }
  })

class NoteLockedError extends Error {}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  if (!canWriteObservation(role, session.user.username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const validated = NoteSchema.parse(await request.json())

    const candidate = await prisma.candidate.findUnique({
      where: { id: validated.candidateId },
      select: { id: true, name: true, level: true, selectedInterviewer: true, notes: { select: { id: true, isLocked: true } }, _count: { select: { formAnswers: true } } },
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

    if (validated.lock && candidate._count.formAnswers === 0) {
      return NextResponse.json({ error: "Formulir orang tua belum diisi. Catatan tidak bisa dikunci sebelum formulir terisi." }, { status: 400 })
    }

    // Catatan + status dalam satu transaksi. Batas unik candidateId di database menolak catatan ganda
    // jika dua permintaan masuk bersamaan. Catatan yang dibuka kuncinya oleh admin diperbarui (bukan dibuat baru);
    // updateMany dengan syarat isLocked=false menolak simpan ganda yang bersamaan.
    const existing = candidate.notes[0] ?? null
    // Lama wawancara diambil dari timer di server milik penyimpan ini (null jika tanpa timer, mis. admin). Dihitung dari
    // jam server, bukan kiriman klien. Gagal membaca tidak boleh menggagalkan penyimpanan catatan.
    const timerRow = await prisma.interviewTimer
      .findUnique({
        where: { interviewerId_candidateId: { interviewerId: session.user.id, candidateId: validated.candidateId } },
        select: { startedAt: true, elapsedMs: true },
      })
      .catch(() => null)
    const interviewSeconds = timerRow ? interviewSecondsFromRow(timerRow, Date.now()) : null
    const noteData = {
      interviewerName: session.user.name || session.user.email || "",
      interviewerEmail: session.user.email || "",
      observation: validated.observation,
      academicAssessment: validated.academicAssessment,
      familySupport: validated.familySupport,
      characterNotes: validated.characterNotes,
      otherNotes: validated.otherNotes || "",
      recommendation: validated.recommendation,
      recommendationReason: validated.recommendation === "Terima" ? "" : validated.recommendationReason || "",
      isLocked: validated.lock,
      ...(interviewSeconds !== null ? { interviewSeconds } : {}),
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
      if (validated.lock) await tx.candidate.update({ where: { id: validated.candidateId }, data: { status: "REVIEWED" } })
      return saved
    })

    await logActivity({
      action: validated.lock ? "CATATAN_KIRIM" : "CATATAN_DRAF",
      targetType: "siswa",
      targetId: candidate.id,
      targetLabel: candidate.name,
      detail: `Rekomendasi: ${validated.recommendation}${existing ? " (diisi ulang setelah dibuka admin)" : ""}`,
    })

    // Siswa selesai: timer wawancara tidak diperlukan lagi, jadi hilang dari monitor admin. Gagal di sini tidak
    // boleh menggagalkan penyimpanan catatan.
    if (validated.lock) await prisma.interviewTimer.deleteMany({ where: { candidateId: validated.candidateId } }).catch(() => undefined)

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
