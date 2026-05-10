import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ListTodo } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { TaskStatus } from '../lib/types'
import { getWeeksInMonth } from '../lib/types'

interface Props {
  monthKey: string
  sponsorId: string
  /** Show a "View weekly tasks" link to the sponsor weekly tasks page (sponsor view only). */
  withLink?: boolean
}

interface Counts {
  total: number
  completed: number
  in_progress: number
  not_started: number
}

const ZERO: Counts = { total: 0, completed: 0, in_progress: 0, not_started: 0 }

export default function WeeklyTaskSummary({ monthKey, sponsorId, withLink }: Props) {
  const [counts, setCounts] = useState<Counts | null>(null)

  const weeks = useMemo(() => getWeeksInMonth(monthKey), [monthKey])

  useEffect(() => {
    if (!sponsorId || weeks.length === 0) return
    let mounted = true
    supabase
      .from('member_weekly_tasks')
      .select('status')
      .eq('sponsor_id', sponsorId)
      .in('week', weeks)
      .then(({ data }) => {
        if (!mounted) return
        const tasks = (data as { status: TaskStatus }[] | null) ?? []
        const c: Counts = { ...ZERO, total: tasks.length }
        for (const t of tasks) c[t.status]++
        setCounts(c)
      })
    return () => {
      mounted = false
    }
  }, [sponsorId, monthKey, weeks])

  const c = counts ?? ZERO
  const pct = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(2,6,23,0.04)]">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <ListTodo className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div className="text-sm font-semibold text-slate-900">
              Weekly tasks this month
            </div>
            <div className="text-sm text-slate-700">
              <span className="font-bold text-slate-900 tabular-nums">
                {c.completed}
              </span>{' '}
              / <span className="tabular-nums">{c.total}</span> completed
              {c.total > 0 && (
                <span className="text-xs text-slate-500 ml-1.5">({pct}%)</span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2.5 h-2 rounded-full bg-slate-100 overflow-hidden">
            {c.total > 0 && (
              <div className="h-full flex">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${(c.completed / c.total) * 100}%` }}
                  title={`${c.completed} completed`}
                />
                <div
                  className="h-full bg-sky-400 transition-all"
                  style={{ width: `${(c.in_progress / c.total) * 100}%` }}
                  title={`${c.in_progress} in progress`}
                />
              </div>
            )}
          </div>

          {/* Breakdown */}
          {c.total > 0 ? (
            <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-600 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="tabular-nums font-medium text-slate-900">
                  {c.completed}
                </span>{' '}
                completed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="tabular-nums font-medium text-slate-900">
                  {c.in_progress}
                </span>{' '}
                in progress
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span className="tabular-nums font-medium text-slate-900">
                  {c.not_started}
                </span>{' '}
                not started
              </span>
            </div>
          ) : counts === null ? (
            <p className="mt-2 text-xs text-slate-400">Loading…</p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              No weekly tasks created for this month yet.
            </p>
          )}

          {withLink && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <Link
                to="/weekly-tasks"
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900"
              >
                Manage weekly tasks
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
