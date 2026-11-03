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
Tugas: Ringkas calon siswa ${level} bernama ${candidateName} untuk dibaca sekilas oleh pewawancara.
Aturan keras: HANYA inti. Tanpa pembuka/penutup, tanpa kalimat panjang, tanpa mengulang isi jawaban, tanpa skor atau persentase.

${level === "SMP"
  ? "Fokus: kepribadian/kesiapan siswa; sebut hanya jika ada kontradiksi jawaban ORANG TUA vs SISWA."
  : "Fokus: keseriusan dan profil keluarga dari jawaban ORANG TUA."}

Data Jawaban:
${formattedAnswers}

Format Output (ikuti persis, total maksimal 60 kata):
**RINGKASAN**: (1 kalimat, maksimal 20 kata)
**POIN UTAMA**:
- (maksimal 3 poin, masing-masing maksimal 6 kata)
**PERHATIAN**: (1 kalimat singkat; tulis "Nihil" jika tidak ada)
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
