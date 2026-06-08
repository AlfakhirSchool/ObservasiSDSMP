import { cn } from "@/lib/utils"
import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            "h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-rose-400 focus:ring-rose-500/30 focus:border-rose-400",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-rose-500">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <textarea
          id={id}
          ref={ref}
          className={cn(
            "w-full min-h-[100px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 resize-y",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-rose-400 focus:ring-rose-500/30 focus:border-rose-400",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-rose-500">{error}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = "Textarea"

export { Input, Textarea }
