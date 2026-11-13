import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-log"
import { allow } from "@/lib/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { QURAN_CATATAN_MAKS } from "@/lib/quran"

const QuranSchema = z
  .object({
    candidateId: z.string().min(1).max(100),
    nilai: z.enum(["A", "B", "C"]).nullable(),
    catatan: z.string().max(QURAN_CATATAN_MAKS, `Catatan terlalu panjang (maks ${QURAN_CATATAN_MAKS} karakter)`),
  })
  .strict()

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Anda belum login" }, { status: 401 })

  const role = session.user.role
  if (role !== "interviewer" && !role.startsWith("admin")) {
    return NextResponse.json({ error: "Anda tidak memiliki akses" }, { status: 403 })
  }

  if (!(await allow(`quran:${session.user.id}`, 60, 60))) {
    return NextResponse.json({ error: "Terlalu sering menyimpan. Coba lagi sebentar lagi." }, { status: 429 })
  }

  try {
    const body: unknown = await request.json().catch(() => null)
    const parsed = QuranSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 })
    }
    const { candidateId, nilai, catatan } = parsed.data
    const catatanBersih = catatan.trim()

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true, name: true },
    })
    if (!candidate) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        quranNilai: nilai,
        quranCatatan: catatanBersih || null,
        quranDinilaiOleh: nilai || catatanBersih ? (session.user.name ?? null) : null,
      },
    })

    await logActivity({
      action: "QURAN_SIMPAN",
      targetType: "siswa",
      targetId: candidate.id,
      targetLabel: candidate.name,
      detail: nilai ? `Nilai ${nilai}` : "Nilai dikosongkan",
    })

    revalidatePath("/interviewer")
    revalidatePath("/interviewer/quran")
    revalidatePath("/admin/candidates")
    revalidatePath(`/admin/candidates/${candidate.id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[POST /api/quran]", error)
    return NextResponse.json({ error: "Gagal menyimpan observasi Al-Qur'an" }, { status: 500 })
  }
}
