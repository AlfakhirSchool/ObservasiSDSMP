export interface Candidate {
  id: string
  name: string
  interviewerName: string
  interviewerEmail: string
  level: "SD" | "SMP"
  status: "pending" | "reviewed" | "noted"
  hasResponse: boolean
  formResponse: Record<string, string> | null
  submittedAt?: string
  rowIndex: number
}

export interface InterviewerNote {
  noteId: string
  candidateId: string
  candidateName?: string
  interviewerEmail: string
  interviewerName: string
  observation: string
  academicAssessment: string
  familySupport: string
  characterNotes: string
  recommendation: "Terima" | "Pertimbangkan" | "Tolak"
  submittedAt: string
  isLocked: boolean
  aiSummary?: string | null
}

export interface InterviewerStats {
  name: string
  email: string
  assigned: number
  withResponses: number
  notesSubmitted: number
  completionRate?: number
  status?: "complete" | "in-progress" | "not-started"
}

export interface AdminStats {
  totalCandidates: number
  totalSD: number
  totalSMP: number
  withResponses: number
  notesSubmitted: number
  completionRate: number
  interviewers: InterviewerStats[]
}
