"use server"

import { prisma } from "@/lib/prisma"
import { assertAdmin } from "@/lib/guards"
import { logActivity } from "@/lib/activity-log"

/**
 * Catat unduhan raport ke riwayat. PDF dibuat di browser, jadi server hanya tahu lewat panggilan ini.
 * Nama siswa diambil dari database (bukan dari klien) dan NIM tidak pernah dicatat.
 */
export async function logRaportDownload(candidateId: string): Promise<void> {
  await assertAdmin()
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId }, select: { name: true, correctedName: true } })
  if (!candidate) return
  await logActivity({
    action: "RAPORT_UNDUH",
    targetType: "raport",
    targetId: candidateId,
    targetLabel: candidate.correctedName || candidate.name,
    detail: "Raport satuan (PDF)",
  })
}

/** Catat unduhan raport massal (zip) sebagai satu entri berisi jumlahnya. */
export async function logRaportBulkDownload(count: number, periodLabel: string): Promise<void> {
  await assertAdmin()
  if (!Number.isInteger(count) || count < 1) return
  await logActivity({
    action: "RAPORT_UNDUH",
    targetType: "raport",
    detail: `${count} raport (zip) · ${periodLabel.slice(0, 80)}`,
  })
}
