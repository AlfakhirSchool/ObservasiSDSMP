import { auth } from "@/lib/auth"
import { getCandidateById } from "@/lib/data-service"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import CandidateDetailClient from "./candidate-detail-client"
import { generateCandidateToken } from "@/lib/candidate-auth"
import type { Metadata } from "next"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ candidateId: string }>
}): Promise<Metadata> {
  const { candidateId } = await params
  const candidate = await getCandidateById(candidateId)
  return {
    title: candidate ? `${candidate.name} — Detail Siswa` : "Siswa Tidak Ditemukan",
  }
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ candidateId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { candidateId } = await params
  const candidate = await getCandidateById(candidateId)
  if (!candidate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-4 rounded-3xl bg-white p-8 border border-slate-200 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Siswa Tidak Ditemukan</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Data siswa dengan ID &quot;{candidateId}&quot; tidak ditemukan. Pastikan tautan yang Anda buka valid.
          </p>
          <div className="pt-2">
            <Link
              href="/interviewer"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              Kembali ke Daftar Siswa
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Untuk SMP: pewawancara hanya boleh membuka siswa yang ditugaskan kepadanya.
  // Untuk SD: setiap siswa SD dapat diakses dan diobservasi oleh semua guru observer SD.
  if (
    session.user.role === "interviewer" &&
    candidate.level !== "SD" &&
    candidate.selectedInterviewer !== session.user.name
  ) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-4 rounded-3xl bg-white p-8 border border-slate-200 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Akses Terbatas</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Siswa <strong>{candidate.name}</strong> ditugaskan kepada <strong>{candidate.selectedInterviewer || "pewawancara lain"}</strong>.
          </p>
          <div className="pt-2">
            <Link
              href="/interviewer"
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
      candidate={candidate}
      existingNote={existingNote}
      savedSummary={savedSummary}
      interviewerName={session.user.name ?? ""}
      canDownload={session.user.role.startsWith("admin")}
      canUnlock={session.user.role.startsWith("admin")}
      candidateToken={generateCandidateToken(candidate.id)}
    />
  )
}
