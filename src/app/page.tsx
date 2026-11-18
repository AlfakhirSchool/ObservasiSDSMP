import { auth } from "@/lib/auth"
import { homePathFor } from "@/lib/permissions"
import { redirect } from "next/navigation"

export default async function RootPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const role = session.user?.role
  if (role === "admin" || role === "admin_sd" || role === "admin_smp") redirect("/admin/admin")
  if (role === "interviewer" || role === "quran_observer" || role === "committee") redirect(homePathFor(role, session.user?.username))
  redirect("/login")
}
