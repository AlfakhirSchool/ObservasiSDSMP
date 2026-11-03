import { createHmac, timingSafeEqual } from "node:crypto"

const SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "al-fakhir-observasi-auth-secret-key-2026"

/**
 * Generate secure HMAC token for a candidate URL / QR Code.
 * Stable for the candidate, giving authenticated access when scanned from authorized screen.
 */
export function generateCandidateToken(candidateId: string): string {
  return createHmac("sha256", SECRET)
    .update(`candidate-access:${candidateId}`)
    .digest("hex")
    .slice(0, 32)
}

/**
 * Verify candidate token in constant time.
 */
export function verifyCandidateToken(candidateId: string, token: string | null | undefined): boolean {
  if (!token || typeof token !== "string" || !candidateId) return false
  const expected = generateCandidateToken(candidateId)
  if (token.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}

/**
 * Normalize phone number by extracting only digits.
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ""
  return phone.replace(/\D/g, "")
}

/**
 * Check if the provided phone input matches the candidate's registered phone.
 * Matches if:
 * 1. Exact match of digits (ignoring country code variations like +62 vs 08).
 * 2. Or if input is 4 or more digits that match the end of the registered phone.
 */
export function verifyParentPhoneMatch(
  registeredPhone: string | null | undefined,
  input: string | null | undefined
): boolean {
  if (!input) return false
  const cleanInput = normalizePhone(input)
  if (!cleanInput) return false

  // If candidate has no phone recorded yet, allow any reasonable phone (>= 8 digits)
  // to be registered as part of verification
  if (!registeredPhone || !normalizePhone(registeredPhone)) {
    return cleanInput.length >= 8
  }

  const cleanReg = normalizePhone(registeredPhone)

  // Exact match
  if (cleanReg === cleanInput) return true

  // Standard Indonesian mobile comparison: 628xxx vs 08xxx
  const regWithoutPrefix = cleanReg.replace(/^(62|0)/, "")
  const inputWithoutPrefix = cleanInput.replace(/^(62|0)/, "")
  if (regWithoutPrefix === inputWithoutPrefix && regWithoutPrefix.length >= 7) return true

  // Last 4 or more digits match
  if (cleanInput.length >= 4 && cleanReg.endsWith(cleanInput)) return true

  return false
}
