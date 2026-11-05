import { prisma } from "@/lib/prisma"

/**
 * Riwayat aktivitas. Berkas ini sengaja TIDAK mengimpor auth supaya bisa dipakai dari auth.ts
 * (login) tanpa impor melingkar; untuk mencatat sebagai pengguna yang sedang login, pakai activity-log.ts.
 */
export const ACTION_LABEL = {
  LOGIN: "Login",
  LOGIN_GAGAL: "Login gagal",
  LOGIN_TERKUNCI: "Login terkunci",
  CALON_TAMBAH: "Tambah siswa",
  CALON_UBAH: "Ubah siswa",
  CALON_HAPUS: "Hapus siswa",
  CALON_IMPOR: "Impor siswa",
  CALON_PEWAWANCARA: "Ganti pewawancara",
  CALON_RUANGAN: "Ganti ruangan",
  CALON_STATUS: "Ubah status siswa",
  CATATAN_KIRIM: "Kirim catatan observasi",
  SD_RAPORT_SIMPAN: "Simpan isian raport SD",
  RINGKASAN_AI: "Buat ringkasan AI",
  FORM_ISI: "Pengisian formulir",
  TES_AKADEMIK: "Tes akademik selesai",
  RAPORT_UNDUH: "Unduh raport",
  USER_TAMBAH: "Tambah pengguna",
  USER_PASSWORD: "Ganti password pengguna",
  USER_HAPUS: "Hapus pengguna",
  SOAL_TAMBAH: "Tambah soal",
  SOAL_UBAH: "Ubah soal",
  SOAL_HAPUS: "Hapus soal",
  SOAL_SINKRON: "Sinkron soal observasi",
} as const

export type ActivityAction = keyof typeof ACTION_LABEL

export interface ActivityEntry {
  action: ActivityAction
  actorId?: string | null
  actorName: string
  actorRole: string
  targetType?: "siswa" | "pengguna" | "soal" | "catatan" | "raport"
  targetId?: string | null
  targetLabel?: string | null
  /** Keterangan singkat. JANGAN berisi password atau NIM. */
  detail?: string | null
  ip?: string | null
}

const MAX = { label: 200, detail: 500 }
const clip = (s: string | null | undefined, n: number) => (s ? s.slice(0, n) : null)

/** Catat satu aktivitas. Tidak pernah melempar error: gagal mencatat tidak boleh menggagalkan aksi aslinya. */
export async function recordActivity(entry: ActivityEntry): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId ?? null,
        actorName: entry.actorName.slice(0, 120),
        actorRole: entry.actorRole,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        targetLabel: clip(entry.targetLabel, MAX.label),
        detail: clip(entry.detail, MAX.detail),
        ip: entry.ip ?? null,
      },
    })
    // Riwayat disimpan 1 tahun; pembersihan ringan (~1 dari 100 pencatatan).
    if (Math.random() < 0.01) {
      await prisma.activityLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 365 * 24 * 3600 * 1000) } } })
    }
  } catch (error) {
    console.error("[activity] gagal mencatat riwayat:", error)
  }
}
