import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function RootPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user?.role?.startsWith("admin")) redirect("/admin/admin")
  if (session.user?.role === "interviewer") redirect("/interviewer")
  redirect("/login")
}
