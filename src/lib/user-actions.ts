"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { logActivity } from "@/lib/activity-log"

export type ActionResult = { ok: true } | { ok: false; error: string }

const ROLES = ["ADMIN", "ADMIN_SD", "ADMIN_SMP", "INTERVIEWER"] as const

const PasswordSchema = z.string().min(8, "Password minimal 8 karakter").max(72, "Password maksimal 72 karakter")

const CreateUserSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,32}$/, "Username 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau strip"),
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  role: z.enum(ROLES),
  password: PasswordSchema,
})

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== "admin") return null
  return session
}

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Data tidak valid"
}

export async function createUser(input: z.input<typeof CreateUserSchema>): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Hanya admin pusat yang dapat menambah pengguna" }

  const parsed = CreateUserSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }
  const { username, name, role, password } = parsed.data

  if (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
    return { ok: false, error: `Username "${username}" sudah dipakai` }
  }

  const created = await prisma.user.create({ data: { username, name, role, passwordHash: hashPassword(password) } })
  await logActivity({ action: "USER_TAMBAH", targetType: "pengguna", targetId: created.id, targetLabel: `${username} (${name})`, detail: `Peran: ${role}` })
  revalidatePath("/admin/users")
  return { ok: true }
}

export async function resetUserPassword(id: string, password: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Hanya admin pusat yang dapat mengubah password" }

  const parsed = PasswordSchema.safeParse(password)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  const target = await prisma.user.findUnique({ where: { id }, select: { username: true, name: true } })
  const updated = await prisma.user.updateMany({ where: { id, username: { not: null } }, data: { passwordHash: hashPassword(parsed.data) } })
  if (updated.count === 0) return { ok: false, error: "Pengguna tidak ditemukan" }
  await logActivity({ action: "USER_PASSWORD", targetType: "pengguna", targetId: id, targetLabel: target?.username ?? target?.name, detail: "Kata sandi diubah" })
  return { ok: true }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const session = await requireAdmin()
  if (!session) return { ok: false, error: "Hanya admin pusat yang dapat menghapus pengguna" }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, username: true, role: true } })
  if (!target) return { ok: false, error: "Pengguna tidak ditemukan" }
  if (target.id === session.user.id) return { ok: false, error: "Anda tidak dapat menghapus akun yang sedang dipakai" }

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN", passwordHash: { not: null } } })
    if (adminCount <= 1) return { ok: false, error: "Tidak dapat menghapus admin pusat terakhir" }
  }

  await prisma.user.delete({ where: { id } })
  await logActivity({ action: "USER_HAPUS", targetType: "pengguna", targetId: id, targetLabel: target.username ?? target.id, detail: `Peran: ${target.role}` })
  revalidatePath("/admin/users")
  return { ok: true }
}
