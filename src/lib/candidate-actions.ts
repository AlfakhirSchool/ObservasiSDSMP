"use server"

import { prisma } from "@/lib/prisma"
import { allow, ipFromHeaders } from "@/lib/rate-limit"
import { headers } from "next/headers"
import { generateCandidateToken, verifyParentPhoneMatch, normalizePhone } from "@/lib/candidate-auth"

export type VerifyResult = { ok: false; error: string } | { ok: true; token: string }

export async function verifyCandidateAccess(candidateId: string, phoneInput: string): Promise<VerifyResult> {
  const h = await headers()
  const ip = ipFromHeaders(h)

  // Rate limit: max 10 verification attempts per IP per 10 minutes
  if (!(await allow(`cand-verify:${ip}`, 10, 600))) {
    return { ok: false, error: "Terlalu banyak percobaan. Silakan coba lagi 10 menit lagi." }
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { id: true, name: true, parentPhone: true, status: true },
  })

  if (!candidate) {
    return { ok: false, error: "Data siswa tidak ditemukan." }
  }

  if (candidate.status === "REVIEWED" || candidate.status === "COMPLETED") {
    return { ok: false, error: "Observasi untuk siswa ini telah selesai dan akses dikunci." }
  }

  const hasRegisteredPhone = Boolean(candidate.parentPhone && normalizePhone(candidate.parentPhone))

  const matches = verifyParentPhoneMatch(candidate.parentPhone, phoneInput)
  if (!matches) {
    return {
      ok: false,
      error: hasRegisteredPhone
        ? "Nomor HP atau 4 digit terakhir tidak sesuai dengan data pendaftaran."
        : "Format nomor HP tidak valid (minimal 8 angka).",
    }
  }

  // If candidate had no phone, save it now
  if (!hasRegisteredPhone && normalizePhone(phoneInput).length >= 8) {
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { parentPhone: phoneInput.trim() },
    })
  }

  const token = generateCandidateToken(candidateId)
  return { ok: true, token }
}
