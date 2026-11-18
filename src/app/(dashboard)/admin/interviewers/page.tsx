import { canViewMonitoring } from "@/lib/permissions"
import { auth } from "@/lib/auth"
import { getInterviewerMonitor } from "@/lib/data-service"
import { redirect } from "next/navigation"
import InterviewerMonitorClient from "./interviewer-monitor-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Monitor Pewawancara",
}

export default async function AdminInterviewersPage() {
  const session = await auth()
  if (!session || !canViewMonitoring(session.user?.role)) redirect("/login")

  const interviewers = await getInterviewerMonitor()
  return <InterviewerMonitorClient interviewers={interviewers} />
}
