import { auth } from "@/lib/auth"
import { getCandidates, getAllNotes } from "@/lib/google-sheets"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function GET(request: Request) {
  const session = await auth()
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") || "xlsx"
  const type = searchParams.get("type") || "candidates"

  try {
    if (type === "notes") {
      const notes = await getAllNotes()
      const exportData = notes.map((n) => ({
        "ID Catatan": n.noteId,
        "ID Siswa": n.candidateId,
        Pewawancara: n.interviewerName,
        "Email Pewawancara": n.interviewerEmail,
        "Observasi Umum": n.observation,
        "Kesiapan Akademik": n.academicAssessment,
        "Dukungan Keluarga": n.familySupport,
        "Karakter & Sikap": n.characterNotes,
        Rekomendasi: n.recommendation,
        "Tanggal Submit": n.submittedAt,
      }))

      return buildResponse(exportData, format, "catatan-observasi")
    }

    // Default: candidates
    const candidates = await getCandidates()
    const exportData = candidates.map((c) => ({
      "Nama Siswa": c.name,
      Jenjang: c.level,
      Pewawancara: c.interviewerName,
      "Email Pewawancara": c.interviewerEmail,
      "Formulir Masuk": c.hasResponse ? "Ya" : "Tidak",
      "Waktu Submit": c.submittedAt || "-",
      "Status Catatan": c.status,
    }))

    return buildResponse(exportData, format, "siswa")
  } catch (error) {
    console.error("[GET /api/admin/export]", error)
    return NextResponse.json({ error: "Gagal mengekspor data" }, { status: 500 })
  }
}

function buildResponse(
  data: Record<string, string>[],
  format: string,
  filename: string
) {
  if (format === "xlsx") {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Data")
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}-${Date.now()}.xlsx"`,
      },
    })
  }

  // CSV fallback
  const headers = Object.keys(data[0] || {})
  const csv = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => `"${String(row[h] || "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}-${Date.now()}.csv"`,
    },
  })
}
