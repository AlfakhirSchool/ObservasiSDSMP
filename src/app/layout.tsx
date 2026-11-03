import { Suspense } from "react"
import type { Metadata } from "next"
import Script from "next/script"
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
        <Script
          id="perf-guard"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  if (typeof window !== 'undefined' && window.performance && window.performance.measure) {
    var _origMeasure = window.performance.measure.bind(window.performance);
    window.performance.measure = function(name, startOrOpts, end) {
      try {
        if (typeof startOrOpts === 'object' && startOrOpts !== null) {
          var opts = Object.assign({}, startOrOpts);
          if (typeof opts.start === 'number' && opts.start < 0) opts.start = 0;
          if (typeof opts.end === 'number' && opts.end < 0) opts.end = 0;
          if (typeof opts.duration === 'number' && opts.duration < 0) opts.duration = 0;
          if (typeof opts.start === 'number' && typeof opts.end === 'number' && opts.end < opts.start) {
            opts.end = opts.start;
          }
          return _origMeasure(name, opts);
        }
        return _origMeasure(name, startOrOpts, end);
      } catch (err) {
        return undefined;
      }
    };
  }
})();
            `,
          }}
        />
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
