import { auth } from "@/lib/auth"
import { getCandidateById } from "@/lib/data-service"
import { redirect } from "next/navigation"
import Link from "next/link"
import CandidateDetailClient from "../../../../interviewer/[candidateId]/candidate-detail-client"
import type { Metadata } from "next"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const candidate = await getCandidateById(id)
  return {
    title: candidate ? `${candidate.name} — Detail Admin` : "Siswa Tidak Ditemukan",
  }
}

export default async function AdminCandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || !session.user?.role?.startsWith("admin")) redirect("/login")

  const { id } = await params
  const candidate = await getCandidateById(id)
  if (!candidate) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-4 rounded-3xl bg-white p-8 border border-slate-200 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Siswa Tidak Ditemukan</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Data siswa dengan ID &quot;{id}&quot; tidak ditemukan.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/candidates"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              Kembali ke Daftar Siswa
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const existingNote = candidate.notes[0] || null
  const savedSummary = candidate.aiSummary?.summary || null

  return (
    <CandidateDetailClient
      candidate={candidate as any}
      existingNote={existingNote}
      savedSummary={savedSummary}
      interviewerName={session.user.name ?? ""}
      canDownload
      canUnlock
    />
  )
}
