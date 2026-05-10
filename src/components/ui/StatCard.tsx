import type { ReactNode } from 'react'

interface Props {
  label: string
  value: number | string | undefined
  loading?: boolean
  hint?: string
  icon?: ReactNode
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger'
  className?: string
}

const toneStyles: Record<NonNullable<Props['tone']>, { card: string; icon: string }> = {
  default: { card: 'bg-white border-slate-200/80', icon: 'bg-slate-100 text-slate-600' },
  accent: {
    card: 'bg-gradient-to-br from-sky-700 to-slate-900 border-sky-900/20 text-white',
    icon: 'bg-white/15 text-white',
  },
  success: { card: 'bg-white border-slate-200/80', icon: 'bg-emerald-100 text-emerald-700' },
  warning: { card: 'bg-white border-slate-200/80', icon: 'bg-amber-100 text-amber-700' },
  danger: { card: 'bg-white border-slate-200/80', icon: 'bg-rose-100 text-rose-700' },
}

export default function StatCard({
  label,
  value,
  loading,
  hint,
  icon,
  tone = 'default',
  className = '',
}: Props) {
  const styles = toneStyles[tone]
  const isAccent = tone === 'accent'
  return (
    <div
      className={`relative overflow-hidden border rounded-2xl p-5 shadow-[0_1px_2px_rgba(2,6,23,0.04),0_8px_24px_-8px_rgba(2,6,23,0.06)] ${styles.card} ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`text-xs font-medium uppercase tracking-wider ${isAccent ? 'text-white/70' : 'text-slate-500'}`}>
          {label}
        </div>
        {icon && (
          <div
            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${styles.icon}`}
          >
            {icon}
          </div>
        )}
      </div>
      <div className={`mt-3 text-3xl font-bold tracking-tight tabular-nums ${isAccent ? 'text-white' : 'text-slate-900'}`}>
        {loading ? (
          <span className="inline-block h-8 w-16 rounded bg-slate-200/70 animate-pulse" />
        ) : (
          (value ?? 0)
        )}
      </div>
      {hint && (
        <div className={`mt-1 text-xs ${isAccent ? 'text-white/70' : 'text-slate-500'}`}>{hint}</div>
      )}
    </div>
  )
}
