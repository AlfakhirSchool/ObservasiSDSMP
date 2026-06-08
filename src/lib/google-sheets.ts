import { google } from "googleapis"
import { unstable_cache } from "next/cache"

const SHEET_ID = process.env.GOOGLE_SHEET_ID!

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
  return auth
}

async function fetchCandidatesInternal(
  interviewerEmail?: string,
  level?: "SD" | "SMP"
) {
  try {
    const auth = await getAuthClient()
    const sheets = google.sheets({ version: "v4", auth })

    const assignmentsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Assignments!A2:F1000",
    })

    const rows = assignmentsRes.data.values || []

    let candidates = rows.map((row, idx) => ({
      id: `cand-${idx + 1}`,
      name: row[0] || "",
      interviewerName: row[1] || "",
      interviewerEmail: row[2] || "",
      level: (row[3] as "SD" | "SMP") || "SD",
      status: (row[4] || "pending") as "pending" | "reviewed" | "noted",
      rowIndex: idx + 2,
      hasResponse: false,
      formResponse: null as Record<string, string> | null,
      submittedAt: undefined as string | undefined,
    }))

    if (interviewerEmail) {
      candidates = candidates.filter(
        (c) => c.interviewerEmail === interviewerEmail
      )
    }

    if (level) {
      candidates = candidates.filter((c) => c.level === level)
    }

    // Fetch form responses per candidate
    const [sdRes, smpRes] = await Promise.all([
      sheets.spreadsheets.values
        .get({ spreadsheetId: SHEET_ID, range: "Responses_SD!A1:ZZ1000" })
        .catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values
        .get({ spreadsheetId: SHEET_ID, range: "Responses_SMP!A1:ZZ1000" })
        .catch(() => ({ data: { values: [] } })),
    ])

    const sdRows = sdRes.data.values || []
    const smpRows = smpRes.data.values || []

    const sdHeaders = sdRows[0] || []
    const smpHeaders = smpRows[0] || []

    const candidatesWithResponses = candidates.map((candidate) => {
      const allRows = candidate.level === "SD" ? sdRows : smpRows
      const headers = candidate.level === "SD" ? sdHeaders : smpHeaders

      const nameColIdx = headers.findIndex((h: string) =>
        h.toLowerCase().includes("nama")
      )

      const matchingRow = allRows.slice(1).find(
        (row) =>
          row[nameColIdx]?.toLowerCase().trim() ===
          candidate.name.toLowerCase().trim()
      )

      if (!matchingRow) return candidate

      const formResponse = headers.reduce(
        (acc: Record<string, string>, header: string, i: number) => {
          acc[header] = matchingRow[i] || ""
          return acc
        },
        {}
      )

      return {
        ...candidate,
        formResponse,
        hasResponse: true,
        submittedAt: formResponse["Timestamp"] || "",
      }
    })

    return candidatesWithResponses
  } catch (error) {
    console.error("[fetchCandidatesInternal] Error:", error)
    return []
  }
}

export async function getCandidates(
  interviewerEmail?: string,
  level?: "SD" | "SMP"
) {
  return unstable_cache(
    () => fetchCandidatesInternal(interviewerEmail, level),
    ["candidates", interviewerEmail || "all", level || "all"],
    { revalidate: 60, tags: ["candidates"] }
  )()
}

export async function getCandidateById(candidateId: string) {
  const all = await getCandidates()
  return all.find((c) => c.id === candidateId) || null
}

export async function getNotesByCandidateId(candidateId: string) {
  try {
    const auth = await getAuthClient()
    const sheets = google.sheets({ version: "v4", auth })

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Notes!A2:L1000",
    })

    const rows = res.data.values || []
    const note = rows.find((row) => row[1] === candidateId)

    if (!note) return null

    return {
      noteId: note[0],
      candidateId: note[1],
      interviewerEmail: note[2],
      interviewerName: note[3],
      observation: note[4],
      academicAssessment: note[5],
      familySupport: note[6],
      characterNotes: note[7],
      recommendation: note[8] as "Terima" | "Pertimbangkan" | "Tolak",
      submittedAt: note[9],
      isLocked: note[10] === "true",
      aiSummary: note[11] || null,
    }
  } catch (error) {
    console.error("[getNotesByCandidateId] Error:", error)
    return null
  }
}

export async function getAllNotes() {
  try {
    const auth = await getAuthClient()
    const sheets = google.sheets({ version: "v4", auth })

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Notes!A2:L1000",
    })

    const rows = res.data.values || []
    return rows.map((note) => ({
      noteId: note[0],
      candidateId: note[1],
      interviewerEmail: note[2],
      interviewerName: note[3],
      observation: note[4],
      academicAssessment: note[5],
      familySupport: note[6],
      characterNotes: note[7],
      recommendation: note[8] as "Terima" | "Pertimbangkan" | "Tolak",
      submittedAt: note[9],
      isLocked: note[10] === "true",
      aiSummary: note[11] || null,
    }))
  } catch (error) {
    console.error("[getAllNotes] Error:", error)
    return []
  }
}

export async function saveNote(noteData: {
  candidateId: string
  interviewerEmail: string
  interviewerName: string
  observation: string
  academicAssessment: string
  familySupport: string
  characterNotes: string
  recommendation: string
  aiSummary?: string
}) {
  const auth = await getAuthClient()
  const sheets = google.sheets({ version: "v4", auth })

  const noteId = `note-${Date.now()}`
  const now = new Date().toISOString()

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "Notes!A:L",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          noteId,
          noteData.candidateId,
          noteData.interviewerEmail,
          noteData.interviewerName,
          noteData.observation,
          noteData.academicAssessment,
          noteData.familySupport,
          noteData.characterNotes,
          noteData.recommendation,
          now,
          "true",
          noteData.aiSummary || "",
        ],
      ],
    },
  })

  return { noteId, submittedAt: now }
}

export async function saveAiSummary(candidateId: string, summary: string) {
  const auth = await getAuthClient()
  const sheets = google.sheets({ version: "v4", auth })

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "AI_Summaries!A:C",
    valueInputOption: "RAW",
    requestBody: {
      values: [[candidateId, summary, new Date().toISOString()]],
    },
  })
}

export async function getAiSummary(candidateId: string): Promise<string | null> {
  try {
    const auth = await getAuthClient()
    const sheets = google.sheets({ version: "v4", auth })

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "AI_Summaries!A2:C1000",
    })

    const rows = res.data.values || []
    const row = rows.find((r) => r[0] === candidateId)
    return row ? row[1] : null
  } catch {
    return null
  }
}

export async function getAdminStats() {
  const allCandidates = await getCandidates()

  const totalSD = allCandidates.filter((c) => c.level === "SD").length
  const totalSMP = allCandidates.filter((c) => c.level === "SMP").length
  const withResponses = allCandidates.filter((c) => c.hasResponse).length

  const notes = await getAllNotes()

  const interviewerStats: Record<
    string,
    {
      name: string
      email: string
      assigned: number
      withResponses: number
      notesSubmitted: number
      completionRate: number
      status: "complete" | "in-progress" | "not-started"
    }
  > = {}

  allCandidates.forEach((c) => {
    if (!interviewerStats[c.interviewerEmail]) {
      interviewerStats[c.interviewerEmail] = {
        name: c.interviewerName,
        email: c.interviewerEmail,
        assigned: 0,
        withResponses: 0,
        notesSubmitted: 0,
        completionRate: 0,
        status: "not-started",
      }
    }
    interviewerStats[c.interviewerEmail].assigned++
    if (c.hasResponse) interviewerStats[c.interviewerEmail].withResponses++
  })

  notes.forEach((note) => {
    const email = note.interviewerEmail
    if (interviewerStats[email]) {
      interviewerStats[email].notesSubmitted++
    }
  })

  // Calculate completion rates and statuses
  Object.values(interviewerStats).forEach((stat) => {
    stat.completionRate =
      stat.assigned > 0
        ? Math.round((stat.notesSubmitted / stat.assigned) * 100)
        : 0
    stat.status =
      stat.completionRate === 100
        ? "complete"
        : stat.notesSubmitted > 0
        ? "in-progress"
        : "not-started"
  })

  return {
    totalCandidates: allCandidates.length,
    totalSD,
    totalSMP,
    withResponses,
    notesSubmitted: notes.length,
    completionRate:
      allCandidates.length > 0
        ? Math.round((notes.length / allCandidates.length) * 100)
        : 0,
    interviewers: Object.values(interviewerStats),
  }
}
