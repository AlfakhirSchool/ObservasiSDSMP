import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import TimerMonitorClient from "./timer-client"

export const metadata: Metadata = {
  title: "Monitor Timer Wawancara",
}

export const dynamic = "force-dynamic"

export default async function AdminTimerPage() {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) redirect("/login")
  return <TimerMonitorClient />
}
