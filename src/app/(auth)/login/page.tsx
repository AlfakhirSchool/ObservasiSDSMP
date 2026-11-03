import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import LoginClient from "./login-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Masuk — Al Fakhir Observation Dashboard",
  description: "Masuk ke sistem dashboard observasi penerimaan siswa Al Fakhir",
}

export const dynamic = "force-dynamic"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await auth()
  const params = await searchParams
  const error = params?.error

  if (session?.user?.role === "admin") redirect("/admin")
  if (session?.user?.role === "interviewer") redirect("/interviewer")

  const users = await prisma.user.findMany({
    where: { username: { not: null }, passwordHash: { not: null } },
    select: { username: true, name: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })

  return (
    <LoginClient
      error={error}
      users={users.flatMap((u) =>
        u.username ? [{ username: u.username, label: u.name ?? u.username }] : []
      )}
    />
  )
}
