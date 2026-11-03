import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

// Format: scrypt$<saltHex>$<hashHex>. Keep in sync with prisma/set-user.cjs.
const KEY_LEN = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, KEY_LEN)
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$")
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, "hex")
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length)
  return timingSafeEqual(actual, expected)
}

// Burn equal CPU for unknown users so response time doesn't reveal valid usernames.
const DUMMY_HASH = hashPassword("dummy-password")
export function verifyDummyPassword(password: string): void {
  verifyPassword(password, DUMMY_HASH)
}
