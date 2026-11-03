import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import UsersClient from "./users-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pengguna",
}

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session || session.user?.role !== "admin") redirect("/login")

  const users = await prisma.user.findMany({
    where: { username: { not: null }, passwordHash: { not: null } },
    select: { id: true, username: true, name: true, role: true, createdAt: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })

  return (
    <UsersClient
      currentUserId={session.user.id}
      users={users.flatMap((u) =>
        u.username
          ? [{ id: u.id, username: u.username, name: u.name ?? u.username, role: u.role, createdAt: u.createdAt.toISOString() }]
          : []
      )}
    />
  )
}
