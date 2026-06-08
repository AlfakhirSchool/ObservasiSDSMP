import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import LoginClient from "./login-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Masuk — Al Fakhir Observation Dashboard",
  description: "Masuk ke sistem dashboard observasi penerimaan siswa Al Fakhir",
}

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

  return <LoginClient error={error} />
}
