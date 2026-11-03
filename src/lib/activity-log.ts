import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { ipFromHeaders } from "@/lib/rate-limit"
import { recordActivity, type ActivityEntry } from "@/lib/activity"

type SessionEntry = Omit<ActivityEntry, "actorId" | "actorName" | "actorRole" | "ip"> & {
  /** Dipakai jika tidak ada sesi login (pengunjung publik). */
  anonymousName?: string
}

/**
 * Catat aktivitas atas nama pengguna yang sedang login (atau "Publik" bila tidak ada sesi).
 * Tidak pernah melempar error: riwayat tidak boleh menggagalkan aksi aslinya.
 */
export async function logActivity(entry: SessionEntry): Promise<void> {
  try {
    const [session, h] = await Promise.all([auth(), headers()])
    const { anonymousName, ...rest } = entry
    await recordActivity({
      ...rest,
      actorId: session?.user?.id ?? null,
      actorName: session?.user?.name ?? session?.user?.email ?? anonymousName ?? "Publik",
      actorRole: session?.user?.role ?? "publik",
      ip: ipFromHeaders(h),
    })
  } catch (error) {
    console.error("[activity] gagal mencatat riwayat:", error)
  }
}
