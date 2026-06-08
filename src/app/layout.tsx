import { Suspense } from "react"
import type { Metadata } from "next"
import { Toaster } from "react-hot-toast"
import ProgressBar from "@/components/providers/progress-bar"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Al Fakhir Observation Dashboard",
    template: "%s | Al Fakhir Dashboard",
  },
  description:
    "Sistem Dashboard Observasi dan Wawancara Penerimaan Siswa Baru SD/SMP Islam Modern Al Fakhir",
  keywords: ["Al Fakhir", "observasi", "wawancara", "penerimaan siswa", "PPDB"],
  icons: {
    icon: "/data.png",
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>
        <Suspense fallback={null}>
          <ProgressBar />
        </Suspense>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#f1f5f9",
              border: "1px solid #334155",
              borderRadius: "12px",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#f43f5e", secondary: "#fff" },
            },
          }}
        />
      </body>
    </html>
  )
}
