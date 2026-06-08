"use server"

import { prisma } from "@/lib/prisma"
import { Level } from "@prisma/client"
import { getAcademicYear } from "@/lib/utils"

// Helper for revalidation to avoid top-level next/cache import in client bundle
async function triggerRevalidate(path: string) {
  try {
    const { revalidatePath } = await import("next/cache")
    revalidatePath(path)
  } catch (e) {
    // This might happen in client context during bundling, ignore
  }
}

export async function addCandidate(data: { name: string; level: string; room?: string; selectedInterviewer?: string }) {
  try {
    await prisma.candidate.create({
      data: {
        name: data.name,
        level: data.level as Level,
        room: data.room || null,
        selectedInterviewer: data.selectedInterviewer || null,
        status: "PENDING",
        // @ts-ignore
        academicYear: getAcademicYear()
      },
    })
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
  try {
    await prisma.candidate.delete({ where: { id } })
    await triggerRevalidate("/admin/candidates")
    await triggerRevalidate("/academic")
    await triggerRevalidate("/form")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Gagal menghapus kandidat" }
  }
}

export async function syncQuestions(questions: any[]) {
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
  try {
    await prisma.candidate.update({
      where: { id },
      data: { selectedInterviewer: interviewer },
    })
    await triggerRevalidate("/admin/candidates")
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}
export async function updateCandidateRoom(id: string, room: string) {
  try {
    await prisma.candidate.update({
      where: { id },
      data: { room: room || null },
    })
    await triggerRevalidate("/admin/candidates")
    await triggerRevalidate("/admin/admin")
    return { success: true }
  } catch (error) {
    console.error("Failed to update candidate room:", error)
    return { success: false, error: "Gagal memperbarui ruangan" }
  }
}
export async function addQuestion(data: { text: string; category: string; level: Level; order: number; type: string; options?: string[] }) {
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
    await triggerRevalidate("/admin/questions")
    return { success: true }
  } catch (error) {
    console.error("Add question error:", error)
    return { success: false }
  }
}

export async function updateQuestion(id: string, data: { text?: string; category?: string; order?: number; type?: string; options?: string[] }) {
  try {
    await prisma.formQuestion.update({ 
      where: { id }, 
      data: {
        ...data,
        options: data.options ? JSON.stringify(data.options) : undefined
      } 
    })
    await triggerRevalidate("/admin/questions")
    return { success: true }
  } catch (error) {
    console.error("Update question error:", error)
    return { success: false }
  }
}

export async function deleteQuestion(id: string) {
  try {
    const question = await prisma.formQuestion.findUnique({ where: { id } })
    // @ts-ignore
    if (question?.isSystem) {
      return { success: false, error: "Pertanyaan sistem tidak dapat dihapus" }
    }
    
    await prisma.formQuestion.delete({ where: { id } })
    await triggerRevalidate("/admin/questions")
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}

export async function updateCandidate(id: string, data: { name?: string; level?: Level }) {
  try {
    await prisma.candidate.update({ where: { id }, data })
    await triggerRevalidate("/admin/candidates")
    await triggerRevalidate("/academic")
    await triggerRevalidate("/form")
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}

export async function updateCandidateStatus(id: string, status: any) {
  try {
    await prisma.candidate.update({
      where: { id },
      data: { status },
    })
    await triggerRevalidate("/admin/candidates")
    await triggerRevalidate("/admin/admin")
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}

export async function importCandidates(candidates: any[]) {
  try {
    const year = getAcademicYear()
    
    // Process in bulk
    await prisma.candidate.createMany({
      data: candidates.map(c => ({
        name: c.name,
        level: c.level as Level,
        room: c.room || null,
        selectedInterviewer: c.interviewer || null,
        status: "PENDING",
        academicYear: year
      }))
    })
    
    await triggerRevalidate("/admin/candidates")
    await triggerRevalidate("/admin/admin")
    await triggerRevalidate("/academic")
    await triggerRevalidate("/form")
    return { success: true, count: candidates.length }
  } catch (error) {
    console.error("Import error:", error)
    return { success: false, error: "Gagal mengimpor data. Pastikan format kolom sudah benar." }
  }
}
