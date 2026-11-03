import type { Session } from "next-auth"

export type UserRole = Session["user"]["role"]

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  admin_sd: "Admin SD",
  admin_smp: "Admin SMP",
  interviewer: "Pewawancara",
  unauthorized: "Tidak berwenang",
}

export function getRoleLabel(role: UserRole | undefined): string {
  return role ? ROLE_LABELS[role] : ROLE_LABELS.interviewer
}

/** Strips the unit prefix ("SMPI ", "SD ") used by admin accounts from a display name. */
export function getDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim()
  if (!trimmed) return "User"
  return trimmed.replace(/^(SMPI|SD)\s+/, "") || trimmed
}
