import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function RootPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user?.role === "admin") redirect("/admin")
  if (session.user?.role === "interviewer") redirect("/interviewer")
  redirect("/login")
}
