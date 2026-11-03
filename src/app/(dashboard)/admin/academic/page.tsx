import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import AcademicManagerClient from "@/app/(dashboard)/admin/academic/AcademicManagerClient"

export default async function AdminAcademicPage() {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) {
    redirect("/login")
  }

  return <AcademicManagerClient />
}
