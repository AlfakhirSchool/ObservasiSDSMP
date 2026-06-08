import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"

const NoteSchema = z.object({
  candidateId: z.string(),
  observation: z.string().min(1, "Catatan observasi wajib diisi"),
  academicAssessment: z.string().min(1, "Penilaian akademik wajib diisi"),
  familySupport: z.string().min(1, "Catatan keluarga wajib diisi"),
  characterNotes: z.string().min(1, "Catatan karakter wajib diisi"),
  otherNotes: z.string().optional(),
  recommendation: z.enum(["Terima", "Pertimbangkan", "Tolak"]),
  interviewerName: z.string().min(1, "Nama pewawancara wajib diisi"),
  aiSummary: z.string().optional(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const validated = NoteSchema.parse(body)

    const candidate = await prisma.candidate.findUnique({
      where: { id: validated.candidateId },
      include: { notes: true }
    })

    if (!candidate) {
      return NextResponse.json({ error: "Kandidat tidak ditemukan" }, { status: 404 })
    }

    if (candidate.notes.some(n => n.isLocked)) {
      return NextResponse.json(
        { error: "Catatan sudah dikirim dan tidak dapat diubah" },
        { status: 409 }
      )
    }

    const note = await prisma.interviewerNote.create({
      data: {
        candidateId: validated.candidateId,
        interviewerName: validated.interviewerName,
        interviewerEmail: session.user.email || "",
        observation: validated.observation,
        academicAssessment: validated.academicAssessment,
        familySupport: validated.familySupport,
        characterNotes: validated.characterNotes,
        otherNotes: validated.otherNotes || "",
        recommendation: validated.recommendation,
        isLocked: true,
      }
    })

    // Update candidate status
    await prisma.candidate.update({
      where: { id: validated.candidateId },
      data: { status: "REVIEWED" }
    })

    revalidatePath("/interviewer")
    revalidatePath(`/interviewer/${validated.candidateId}`)
    revalidatePath("/admin/candidates")

    return NextResponse.json(note)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.issues },
        { status: 422 }
      )
    }
    console.error("[POST /api/notes]", error)
    return NextResponse.json({ error: "Gagal menyimpan catatan" }, { status: 500 })
  }
}
