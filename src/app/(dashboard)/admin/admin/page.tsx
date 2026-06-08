import { auth } from "@/lib/auth"
import { getDashboardStats } from "@/lib/data-service"
import { redirect } from "next/navigation"
import AdminOverviewClient from "../admin-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Ringkasan Admin - Al Fakhir",
}

export default async function AdminPage() {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) redirect("/login")

  const role = session.user.role as string
  let levelFilter: string | undefined = undefined
  
  if (role === "admin_sd") levelFilter = "SD"
  if (role === "admin_smp") levelFilter = "SMP"

  const stats = await getDashboardStats(levelFilter)

  return (
    <div className="space-y-6">
      <AdminOverviewClient stats={stats} role={session.user.role} />
    </div>
  )
}
