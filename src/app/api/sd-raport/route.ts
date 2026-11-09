import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-log"
import { allow } from "@/lib/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import {
  SD_ASPEK,
  SD_CATATAN_MAKS,
  SD_INDIKATOR_KODE,
  SD_JUMLAH_INDIKATOR,
  serializeSdRaport,
  type SdAspekId,
  type SdNilai,
} from "@/lib/raport-sd"

const KODE = new Set(SD_INDIKATOR_KODE)

const catatanTeks = z.string().max(SD_CATATAN_MAKS, `Catatan terlalu panjang (maks ${SD_CATATAN_MAKS} karakter)`)

const SdRaportSchema = z
  .object({
    candidateId: z.string().min(1).max(100),
    asalSekolah: z.string().trim().max(120, "Asal sekolah terlalu panjang (maks 120 karakter)").optional(),
    nilai: z
      .record(z.string(), z.enum(["baik", "perlu"]))
      .refine((v) => Object.keys(v).every((k) => KODE.has(k)), "Kode indikator tidak dikenal"),
    catatan: z
      .object({
        kognitif: catatanTeks.optional(),
        motorikHalus: catatanTeks.optional(),
        motorikKasar: catatanTeks.optional(),
        quran: catatanTeks.optional(),
      })
      .strict(),
  })
  .strict()

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Anda belum login" }, { status: 401 })

  const role = session.user.role
  if (role !== "interviewer" && !role.startsWith("admin")) {
    return NextResponse.json({ error: "Anda tidak memiliki akses" }, { status: 403 })
  }

  if (!(await allow(`sd-raport:${session.user.id}`, 40, 60))) {
    return NextResponse.json({ error: "Terlalu sering menyimpan. Coba lagi sebentar lagi." }, { status: 429 })
  }

  try {
    const body: unknown = await request.json().catch(() => null)
    const parsed = SdRaportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 })
    }
    const { candidateId, asalSekolah, nilai, catatan } = parsed.data

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true, name: true, level: true, selectedInterviewer: true },
    })
    if (!candidate) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
    }
    if (candidate.level !== "SD") {
      return NextResponse.json({ error: "Raport ini hanya untuk siswa SD" }, { status: 400 })
    }
    // Untuk SD: setiap guru observer berhak mengisi dan menyimpan raport observasi SD.

    // Catatan kosong/spasi dibuang: aspek tanpa catatan memakai catatan bawaan saat raport dibuat.
    const catatanBersih: Partial<Record<SdAspekId, string>> = {}
    for (const aspek of SD_ASPEK) {
      const teks = catatan[aspek.id]?.trim()
      if (teks) catatanBersih[aspek.id] = teks
    }
    const nilaiBersih: Partial<Record<string, SdNilai>> = nilai

    // Tidak ada kunci: raport boleh disimpan ulang kapan saja, juga setelah catatan observasi terkunci.
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        sdRaport: serializeSdRaport({ nilai: nilaiBersih, catatan: catatanBersih }),
        originSchool: asalSekolah || null,
      },
    })

    const terisi = Object.keys(nilaiBersih).length
    await logActivity({
      action: "SD_RAPORT_SIMPAN",
      targetType: "siswa",
      targetId: candidate.id,
      targetLabel: candidate.name,
      detail: `${terisi}/${SD_JUMLAH_INDIKATOR} indikator terisi`,
    })

    revalidatePath("/interviewer")
    revalidatePath(`/interviewer/${candidate.id}`)
    revalidatePath("/admin/candidates")
    revalidatePath(`/admin/candidates/${candidate.id}`)

    return NextResponse.json({ success: true, terisi })
  } catch (error) {
    console.error("[POST /api/sd-raport]", error)
    return NextResponse.json({ error: "Gagal menyimpan raport SD" }, { status: 500 })
  }
}
