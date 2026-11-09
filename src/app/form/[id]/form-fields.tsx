"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { isOther, type FormQuestion } from "./form-logic"
import { FALLBACK_STEP_ICON, GENERIC_STEP_ICON, SECTION_ICON, type Accent } from "./form-theme"

/** Ikon sebuah bagian formulir; bagian "Pertanyaan n dari m" memakai ikon umum. */
export function SectionIcon({ title, className }: { title: string; className?: string }) {
  const Icon = SECTION_ICON[title] ?? (title.startsWith("Pertanyaan") ? GENERIC_STEP_ICON : FALLBACK_STEP_ICON)
  return <Icon className={className} aria-hidden="true" />
}
const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm shadow-slate-900/[0.02] placeholder:text-slate-400 transition-colors hover:border-slate-300 focus:outline-none focus:ring-2"

interface FieldProps {
  q: FormQuestion
  value: string
  onChange: (value: string) => void
  accent: Accent
}

export function QuestionField({ q, value, onChange, accent }: FieldProps) {
  const id = `f-${q.id}`

  if (q.type === "choice") return <ChoiceField q={q} value={value} onChange={onChange} accent={accent} />

  if (q.type === "long_text") {
    return (
      <textarea
        id={id}
        value={value}
        maxLength={5000}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tulis jawaban Anda"
        className={cn(INPUT, "min-h-[104px] resize-y leading-relaxed [field-sizing:content]", accent.ring)}
      />
    )
  }

  if (q.type === "rating") {
    return (
      <div role="radiogroup" aria-labelledby={id} className="flex gap-2">
        {[1, 2, 3, 4, 5].map((num) => {
          const on = value === String(num)
          return (
            <button
              key={num}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(String(num))}
              className={cn(
                "h-12 w-12 rounded-full border text-[15px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2",
                on ? cn("scale-105 text-white shadow-md", accent.bar, accent.border, accent.glow) : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                accent.ring
              )}
            >
              {num}
            </button>
          )
        })}
      </div>
    )
  }

  const numeric = q.type === "number"
  return (
    <input
      id={id}
      type={q.inputKind === "tel" ? "tel" : "text"}
      inputMode={q.inputKind === "tel" ? "tel" : numeric ? "decimal" : "text"}
      autoComplete="off"
      maxLength={numeric ? 12 : 500}
      value={value}
      onChange={(e) => onChange(numeric ? e.target.value.replace(/[^0-9.,]/g, "") : e.target.value)}
      placeholder={numeric ? "Isi angka" : "Tulis jawaban Anda"}
      className={cn(INPUT, accent.ring)}
    />
  )
}

function ChoiceField({ q, value, onChange, accent }: FieldProps) {
  const options = q.options ?? []
  const regular = options.filter((o) => !isOther(o))
  const otherLabel = options.find(isOther)
  // Jawaban yang bukan salah satu pilihan baku dianggap isian "Yang lain".
  const custom = otherLabel !== undefined && value !== "" && !regular.includes(value)
  const [otherPicked, setOtherPicked] = useState(custom)
  const otherActive = otherPicked || custom

  const pick = (opt: string) => {
    setOtherPicked(false)
    onChange(opt)
  }

  const chip = (on: boolean) =>
    cn(
      "relative flex min-h-[52px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-center text-[14px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98]",
      on
        ? cn("text-white shadow-md", accent.bar, accent.border, accent.glow)
        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
      accent.ring
    )

  const tick = (on: boolean) => on && <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-labelledby={`f-${q.id}`} id={`f-${q.id}`} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {regular.map((opt) => {
          const on = !otherActive && value === opt
          return (
            <button key={opt} type="button" role="radio" aria-checked={on} onClick={() => pick(opt)} className={chip(on)}>
              {tick(on)}
              {opt}
            </button>
          )
        })}
        {otherLabel !== undefined && (
          <button
            type="button"
            role="radio"
            aria-checked={otherActive}
            onClick={() => {
              setOtherPicked(true)
              if (regular.includes(value)) onChange("")
            }}
            className={chip(otherActive)}
          >
            {tick(otherActive)}
            {otherLabel.replace(/:\s*$/, "")}
          </button>
        )}
      </div>
      {otherActive && (
        <input
          type="text"
          autoFocus
          autoComplete="off"
          maxLength={200}
          aria-label={`${q.text} (isian lain)`}
          value={custom ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tulis jawaban Anda"
          className={cn(INPUT, accent.ring)}
        />
      )}
    </div>
  )
}
