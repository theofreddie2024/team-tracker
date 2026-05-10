import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const baseInputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 hover:border-slate-300 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...rest }, ref) {
    return <input ref={ref} className={`${baseInputClass} ${className}`} {...rest} />
  },
)

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = '', children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={`${baseInputClass} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-[right_0.75rem_center] bg-no-repeat pr-9 ${className}`}
      {...rest}
    >
      {children}
    </select>
  )
})

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = '', ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={`${baseInputClass} resize-y min-h-[88px] ${className}`}
      {...rest}
    />
  )
})

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className = '',
}: {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-800 mb-1.5">
          {label}
          {required && <span className="ml-0.5 text-rose-600">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export const Checkbox = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: string }
>(function Checkbox({ label, className = '', ...rest }, ref) {
  return (
    <label className="inline-flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
      <input
        ref={ref}
        type="checkbox"
        className={`w-4 h-4 rounded border-slate-300 text-sky-700 focus:ring-2 focus:ring-sky-600/30 ${className}`}
        {...rest}
      />
      {label && <span>{label}</span>}
    </label>
  )
})
