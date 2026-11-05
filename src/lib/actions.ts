"use server"

import { prisma } from "@/lib/prisma"
import { Level } from "@prisma/client"
import { getAcademicYear } from "@/lib/utils"
import { getCurrentGelombang } from "@/lib/data-service"
import { assertAdmin } from "@/lib/guards"
import { logActivity } from "@/lib/activity-log"

// Helper for revalidation to avoid top-level next/cache import in client bundle
async function triggerRevalidate(path: string) {
  try {
    const { revalidatePath } = await import("next/cache")
    revalidatePath(path)
  } catch (e) {
    // This might happen in client context during bundling, ignore
  }
}


const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()

/** Nama siswa (asli & koreksi orang tua) yang sudah ada pada jenjang dan tahun ajaran itu, sudah dinormalisasi. */
async function existingNames(level: Level, academicYear: string) {
  const rows = await prisma.candidate.findMany({ where: { level, academicYear }, select: { name: true, correctedName: true } })
  return rows.flatMap((r) => [normalizeName(r.name), ...(r.correctedName ? [normalizeName(r.correctedName)] : [])])
}
export async function addCandidate(data: { name: string; level: string; room?: string; selectedInterviewer?: string; gelombang?: number; nim?: string }) {
  await assertAdmin()
  try {
    const year = getAcademicYear()
    if ((await existingNames(data.level as Level, year)).includes(normalizeName(data.name))) {
      return { success: false, error: `Siswa "${data.name.trim()}" sudah terdaftar di jenjang ini (tahun ajaran ${year}).` }
    }
    const created = await prisma.candidate.create({
      data: {
        name: data.name,
        level: data.level as Level,
        room: data.room || null,
        selectedInterviewer: data.selectedInterviewer || null,
        status: "PENDING",
        academicYear: year,
        gelombang: data.gelombang ?? (await getCurrentGelombang(year)),
        nim: data.nim ?? null,
      },
      select: { id: true, name: true },
    })
    await logActivity({ action: "CALON_TAMBAH", targetType: "siswa", targetId: created.id, targetLabel: created.name, detail: `Jenjang ${data.level}` })
    await triggerRevalidate("/admin/candidates")
    await triggerRevalidate("/admin/admin")
    await triggerRevalidate("/academic")
    await triggerRevalidate("/form")
    return { success: true }

  } catch (error) {
    console.error("Failed to add candidate:", error)
    return { success: false, error: "Gagal menambahkan kandidat" }
  }
}

export async function deleteCandidate(id: string) {
  await assertAdmin()
  try {
    const deleted = await prisma.candidate.delete({ where: { id }, select: { name: true } })
    await logActivity({ action: "CALON_HAPUS", targetType: "siswa", targetId: id, targetLabel: deleted.name })
    await triggerRevalidate("/admin/candidates")
    await triggerRevalidate("/academic")
    await triggerRevalidate("/form")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Gagal menghapus kandidat" }
  }
}

export async function syncQuestions(questions: any[]) {
  await assertAdmin()
  try {
    // This is handled by the API route currently, but we could do it here too
    // For now, let's just make it a revalidation trigger
    await triggerRevalidate("/admin/questions")
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}


export async function updateCandidateInterviewer(id: string, interviewer: string) {
  await assertAdmin()
  try {
    const updated = await prisma.candidate.update({
      where: { id },
      data: { selectedInterviewer: interviewer },
      select: { name: true },
    })
    await logActivity({ action: "CALON_PEWAWANCARA", targetType: "siswa", targetId: id, targetLabel: updated.name, detail: `Pewawancara: ${interviewer || "-"}` })
    await triggerRevalidate("/admin/candidates")
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}
export async function updateCandidateRoom(id: string, room: string) {
  await assertAdmin()
  try {
    const updated = await prisma.candidate.update({
      where: { id },
      data: { room: room || null },
      select: { name: true },
    })
    await logActivity({ action: "CALON_RUANGAN", targetType: "siswa", targetId: id, targetLabel: updated.name, detail: `Ruangan: ${room || "-"}` })
    await triggerRevalidate("/admin/candidates")
    await triggerRevalidate("/admin/admin")
    return { success: true }
  } catch (error) {
    console.error("Failed to update candidate room:", error)
    return { success: false, error: "Gagal memperbarui ruangan" }
  }
}
export async function addQuestion(data: { text: string; category: string; level: Level; order: number; type: string; options?: string[] }) {
  await assertAdmin()
  try {
    await prisma.formQuestion.create({ 
      data: {
        text: data.text,
        category: data.category,
        level: data.level,
        order: data.order,
        type: data.type,
        options: data.options ? JSON.stringify(data.options) : null
      } 
    })
    await logActivity({ action: "SOAL_TAMBAH", targetType: "soal", targetLabel: data.text, detail: `${data.level} · ${data.category}` })
    await triggerRevalidate("/admin/questions")
    return { success: true }
  } catch (error) {
    console.error("Add question error:", error)
    return { success: false }
  }
}

export async function updateQuestion(id: string, data: { text?: string; category?: string; order?: number; type?: string; options?: string[] }) {
  await assertAdmin()
  try {
    const updated = await prisma.formQuestion.update({ 
      where: { id }, 
      data: {
        ...data,
        options: data.options ? JSON.stringify(data.options) : undefined
      },
      select: { text: true },
    })
    await logActivity({ action: "SOAL_UBAH", targetType: "soal", targetId: id, targetLabel: updated.text, detail: `Diubah: ${Object.keys(data).join(", ")}` })
    await triggerRevalidate("/admin/questions")
    return { success: true }
  } catch (error) {
    console.error("Update question error:", error)
    return { success: false }
  }
}

export async function deleteQuestion(id: string) {
  await assertAdmin()
  try {
    const question = await prisma.formQuestion.findUnique({ where: { id } })
    // @ts-ignore
    if (question?.isSystem) {
      return { success: false, error: "Pertanyaan sistem tidak dapat dihapus" }
    }
    
    await prisma.formQuestion.delete({ where: { id } })
    await logActivity({ action: "SOAL_HAPUS", targetType: "soal", targetId: id, targetLabel: question?.text })
    await triggerRevalidate("/admin/questions")
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}

export async function updateCandidate(id: string, data: { 
  name?: string
  level?: Level
  gelombang?: number
  academicYear?: string | null
  room?: string | null
  selectedInterviewer?: string | null
  nim?: string | null 
  originSchool?: string | null
}) {
  await assertAdmin()
  try {
    const updated = await prisma.candidate.update({ where: { id }, data, select: { name: true } })
    // Isi NIM tidak dicatat (NIM dipakai sebagai kata sandi PDF), hanya nama field yang diubah.
    await logActivity({ action: "CALON_UBAH", targetType: "siswa", targetId: id, targetLabel: updated.name, detail: `Diubah: ${Object.keys(data).join(", ")}` })
    await triggerRevalidate("/admin/candidates")
    await triggerRevalidate("/academic")
    await triggerRevalidate("/form")
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}

export async function updateCandidateStatus(id: string, status: any) {
  await assertAdmin()
  try {
    const updated = await prisma.candidate.update({
      where: { id },
      data: { status },
      select: { name: true },
    })
    await logActivity({ action: "CALON_STATUS", targetType: "siswa", targetId: id, targetLabel: updated.name, detail: `Status menjadi ${String(status)}` })
    await triggerRevalidate("/admin/candidates")
    await triggerRevalidate("/admin/admin")
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}

export async function importCandidates(candidates: any[]) {
  await assertAdmin()
  try {
    const year = getAcademicYear()
    const gelombang = await getCurrentGelombang(year)

    // Lewati nama yang sudah terdaftar (tahun ajaran & jenjang sama) atau muncul dua kali di file.
    const seen = new Set<string>()
    for (const level of ["SD", "SMP"] as const) {
      for (const n of await existingNames(level, year)) seen.add(`${level}|${n}`)
    }
    const fresh = candidates.filter((c) => {
      const key = `${c.level}|${normalizeName(String(c.name ?? ""))}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    const skipped = candidates.length - fresh.length

    await prisma.candidate.createMany({
      data: fresh.map(c => ({
        name: c.name,
        level: c.level as Level,
        room: c.room || null,
        selectedInterviewer: c.interviewer || null,
        status: "PENDING",
        academicYear: year,
        gelombang: gelombang
      }))
    })
    await logActivity({
      action: "CALON_IMPOR",
      targetType: "siswa",
      detail: `${fresh.length} siswa diimpor${skipped > 0 ? `, ${skipped} data kembar dilewati` : ""}`,
    })
    
    await triggerRevalidate("/admin/candidates")
    await triggerRevalidate("/admin/admin")
    await triggerRevalidate("/academic")
    await triggerRevalidate("/form")
    return { success: true, count: fresh.length, skipped }
  } catch (error) {
    console.error("Import error:", error)
    return { success: false, error: "Gagal mengimpor data. Pastikan format kolom sudah benar." }
  }
}
