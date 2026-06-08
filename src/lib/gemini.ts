import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function generateCandidateSummary(
  formResponse: Record<string, string>,
  candidateName: string,
  level: "SD" | "SMP",
  respondentType: "Orang Tua" | "Siswa"
): Promise<string> {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT" as any,
        threshold: "BLOCK_NONE" as any,
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH" as any,
        threshold: "BLOCK_NONE" as any,
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any,
        threshold: "BLOCK_NONE" as any,
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any,
        threshold: "BLOCK_NONE" as any,
      },
    ],
  })

  const formattedAnswers = Object.entries(formResponse)
    .filter(([key]) => !["Timestamp", "Email Address"].includes(key))
    .map(([question, answer]) => `**${question}**: ${answer}`)
    .join("\n")

  const prompt = `
Tugas: Buat ringkasan evaluasi yang SANGAT PENDEK, PADAT, dan JELAS untuk calon siswa ${level} bernama ${candidateName}.
Karakteristik: Langsung ke inti (Executive Summary), bahasa profesional, tanpa kata-kata pembuka/basa-basi.

${level === "SMP" 
  ? "BANDINGKAN JAWABAN: Soroti keselarasan atau kontradiksi antara jawaban ORANG TUA dan SISWA." 
  : "PROFIL KELUARGA: Ringkas keseriusan dan profil keluarga berdasarkan jawaban ORANG TUA."}

Data Jawaban:
${formattedAnswers}

Format Output (WAJIB SINGKAT):
**RINGKASAN INTI**: (Maksimal 2 kalimat padat)
**KESELARASAN**: [X]% (Skor kecocokan data ortu vs siswa/skor reliabilitas)
**POIN UTAMA**: (List 3-4 kata kunci/poin sangat pendek)
**RED FLAGS**: (Jika ada, sebutkan langsung intinya. Jika tidak ada, tulis "Nihil")
**REKOMENDASI SKOR**: [X]/10
  `.trim()

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

export async function generateBatchSummary(
  candidates: Array<{
    name: string
    level: "SD" | "SMP"
    formResponse: Record<string, string>
  }>
): Promise<Record<string, string>> {
  const summaries: Record<string, string> = {}
  const BATCH_SIZE = 5

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(async (c) => {
        const summary = await generateCandidateSummary(
          c.formResponse,
          c.name,
          c.level,
          c.level === "SD" ? "Orang Tua" : "Siswa"
        )
        return { name: c.name, summary }
      })
    )

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        summaries[result.value.name] = result.value.summary
      }
    })

    if (i + BATCH_SIZE < candidates.length) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  return summaries
}
