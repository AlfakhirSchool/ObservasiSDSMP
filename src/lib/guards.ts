import { createHash, timingSafeEqual } from "node:crypto"
import { auth } from "@/lib/auth"

/**
 * Untuk server action: tolak jika bukan admin. Server action adalah endpoint POST publik, jadi pengecekan
 * peran HARUS di sini (proxy.ts hanya menjaga path /admin, bukan ID action).
 */
export async function assertAdmin() {
  const session = await auth()
  if (!session?.user?.role?.startsWith("admin")) throw new Error("Forbidden")
  return session
}

/** Bandingkan rahasia (API key, secret webhook) tanpa bocor lewat waktu; false jika salah satu kosong. */
export function secretsMatch(provided: string | null | undefined, expected: string | null | undefined): boolean {
  if (!provided || !expected) return false
  const a = createHash("sha256").update(provided).digest()
  const b = createHash("sha256").update(expected).digest()
  return timingSafeEqual(a, b)
}
