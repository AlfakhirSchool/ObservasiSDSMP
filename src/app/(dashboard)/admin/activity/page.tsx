import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ActivityClient from "./activity-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Riwayat Aktivitas",
}

export const dynamic = "force-dynamic"

export default async function AdminActivityPage() {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) {
    redirect("/login")
  }

  const initialLogs = await prisma.activityLog.findMany({
    take: 41,
    orderBy: { createdAt: "desc" },
  })

  const hasMore = initialLogs.length > 40
  const items = hasMore ? initialLogs.slice(0, 40) : initialLogs

  return (
    <ActivityClient
      initialLogs={items.map((l) => ({
        id: l.id,
        createdAt: l.createdAt.toISOString(),
        actorId: l.actorId,
        actorName: l.actorName,
        actorRole: l.actorRole,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        targetLabel: l.targetLabel,
        detail: l.detail,
        ip: l.ip,
      }))}
      initialNextCursor={hasMore ? items[items.length - 1].id : null}
    />
  )
}
