"use server"

import { prisma } from "@/lib/prisma"
import { assertAdmin } from "@/lib/guards"

export interface FetchActivityParams {
  action?: string
  role?: string
  search?: string
  cursor?: string
  limit?: number
}

export async function fetchActivityLogs(params: FetchActivityParams) {
  await assertAdmin()
  const { action, role, search, cursor, limit = 40 } = params

  const where: Record<string, unknown> = {}

  if (action && action !== "ALL") {
    where.action = action
  }

  if (role && role !== "ALL") {
    where.actorRole = role
  }

  if (search && search.trim()) {
    const q = search.trim()
    where.OR = [
      { actorName: { contains: q, mode: "insensitive" } },
      { targetLabel: { contains: q, mode: "insensitive" } },
      { detail: { contains: q, mode: "insensitive" } },
      { ip: { contains: q, mode: "insensitive" } },
    ]
  }

  const logs = await prisma.activityLog.findMany({
    where,
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: "desc" },
  })

  const hasMore = logs.length > limit
  const items = hasMore ? logs.slice(0, limit) : logs

  return {
    items: items.map((l) => ({
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
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  }
}
