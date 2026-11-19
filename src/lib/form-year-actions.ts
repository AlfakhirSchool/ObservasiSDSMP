"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { assertAdmin } from "@/lib/guards"
import { logActivity } from "@/lib/activity-log"

const Input = z.object({ academicYear: z.string().trim().min(1).max(32), open: z.boolean() })

/** Buka/tutup satu tahun ajaran di portal /form. Hanya admin. Tahun yang belum pernah diatur dianggap terbuka. */
export async function setFormYearOpen(input: z.input<typeof Input>): Promise<{ ok: true } | { ok: false; error: string }> {
  await assertAdmin()
  const parsed = Input.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Data tidak valid" }
  const { academicYear, open } = parsed.data

  await prisma.formYear.upsert({ where: { academicYear }, create: { academicYear, open }, update: { open } })
  await logActivity({
    action: "FORM_TAHUN",
    targetType: "tahun ajaran",
    targetId: academicYear,
    targetLabel: academicYear,
    detail: open ? "Dibuka di portal formulir" : "Ditutup di portal formulir",
  })
  revalidatePath("/form")
  revalidatePath("/admin/candidates")
  return { ok: true }
}
