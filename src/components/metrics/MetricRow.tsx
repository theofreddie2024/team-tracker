type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const barTone: Record<Tone, string> = {
  accent: 'bg-sky-600',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-indigo-500',
  neutral: 'bg-slate-400',
}

interface Props {
  label: string
  value: number
  total?: number
  hint?: string
  bar?: { value: number; max: number; tone?: Tone }
}

export default function MetricRow({ label, value, total, hint, bar }: Props) {
  const pct = bar && bar.max > 0 ? Math.min(100, (bar.value / bar.max) * 100) : null
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm text-slate-700">{label}</div>
        <div className="text-sm font-semibold text-slate-900 tabular-nums">
          {value}
          {total != null && total > 0 && (
            <span className="text-xs font-normal text-slate-400 ml-1">
              / {total}
            </span>
          )}
        </div>
      </div>
      {pct != null && (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barTone[bar?.tone ?? 'accent']}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  )
}
