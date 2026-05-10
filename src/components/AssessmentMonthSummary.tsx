import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  GraduationCap,
  ListTodo,
  Quote,
  TrendingUp,
  Users,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  getWeeksInMonth,
  type MonthlyAssessment,
  type Profile,
  type TaskStatus,
} from '../lib/types'
import Avatar from './ui/Avatar'

interface Props {
  month: string
  assessments: MonthlyAssessment[] // already filtered to this month
  sponsorMap: Map<string, Profile>
}

interface TaskCounts {
  total: number
  completed: number
}

const ZERO_TASKS: TaskCounts = { total: 0, completed: 0 }

export default function AssessmentMonthSummary({
  month,
  assessments,
  sponsorMap,
}: Props) {
  const [taskCounts, setTaskCounts] = useState<TaskCounts | null>(null)

  const weeks = useMemo(() => getWeeksInMonth(month), [month])

  useEffect(() => {
    if (weeks.length === 0) {
      setTaskCounts(ZERO_TASKS)
      return
    }
    let mounted = true
    supabase
      .from('member_weekly_tasks')
      .select('status')
      .in('week', weeks)
      .then(({ data }) => {
        if (!mounted) return
        const tasks = (data ?? []) as { status: TaskStatus }[]
        setTaskCounts({
          total: tasks.length,
          completed: tasks.filter((t) => t.status === 'completed').length,
        })
      })
    return () => {
      mounted = false
    }
  }, [weeks])

  const totals = useMemo(() => {
    const t = {
      prospects: 0,
      stayed: 0,
      proAttended: 0,
      proMissed: 0,
      distAttended: 0,
      distMissed: 0,
      gigs: 0,
    }
    for (const a of assessments) {
      t.prospects += a.prospects_count
      t.stayed += a.prospects_stayed
      t.proAttended += a.pro_trainings_attended
      t.proMissed += a.pro_trainings_missed
      t.distAttended += a.distributor_trainings_attended
      t.distMissed += a.distributor_trainings_missed
      t.gigs += a.gigs_researched
    }
    return t
  }, [assessments])

  const reflections = useMemo(() => {
    return assessments
      .filter((a) => a.improvement_area || a.next_plan_of_action)
      .map((a) => ({ assessment: a, sponsor: sponsorMap.get(a.sponsor_id) }))
      .sort((a, b) =>
        (a.sponsor?.name ?? '').localeCompare(b.sponsor?.name ?? ''),
      )
  }, [assessments, sponsorMap])

  const conversionPct =
    totals.prospects > 0
      ? Math.round((totals.stayed / totals.prospects) * 100)
      : null
  const proAttendancePct =
    totals.proAttended + totals.proMissed > 0
      ? Math.round(
          (totals.proAttended / (totals.proAttended + totals.proMissed)) * 100,
        )
      : null
  const distAttendancePct =
    totals.distAttended + totals.distMissed > 0
      ? Math.round(
          (totals.distAttended /
            (totals.distAttended + totals.distMissed)) *
            100,
        )
      : null
  const taskPct =
    taskCounts && taskCounts.total > 0
      ? Math.round((taskCounts.completed / taskCounts.total) * 100)
      : null

  if (assessments.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-sky-700" />
        <h2 className="text-base font-semibold text-slate-900">
          This month at a glance
        </h2>
        <span className="text-xs text-slate-400">
          (across {assessments.length} submitted assessment
          {assessments.length === 1 ? '' : 's'})
        </span>
      </div>

      {/* Aggregate stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Stat
          icon={<Users className="w-4 h-4" />}
          tone="accent"
          label="Prospects"
          value={totals.prospects}
          sub={
            conversionPct !== null
              ? `${totals.stayed} stayed (${conversionPct}%)`
              : undefined
          }
        />
        <Stat
          icon={<Briefcase className="w-4 h-4" />}
          tone="warning"
          label="Gigs researched"
          value={totals.gigs}
        />
        <Stat
          icon={<GraduationCap className="w-4 h-4" />}
          tone="success"
          label="Pro trainings"
          value={totals.proAttended}
          sub={
            proAttendancePct !== null
              ? `${proAttendancePct}% attended`
              : undefined
          }
        />
        <Stat
          icon={<TrendingUp className="w-4 h-4" />}
          tone="info"
          label="Distributor trainings"
          value={totals.distAttended}
          sub={
            distAttendancePct !== null
              ? `${distAttendancePct}% attended`
              : undefined
          }
        />
      </div>

      {/* Tasks rollup as its own card */}
      {taskCounts !== null && taskCounts.total > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(2,6,23,0.04)]">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ListTodo className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div className="text-sm font-semibold text-slate-900">
                  Weekly tasks completed (org-wide)
                </div>
                <div className="text-sm text-slate-700">
                  <span className="font-bold text-slate-900 tabular-nums">
                    {taskCounts.completed}
                  </span>{' '}
                  / <span className="tabular-nums">{taskCounts.total}</span>
                  {taskPct !== null && (
                    <span className="text-xs text-slate-500 ml-1.5">
                      ({taskPct}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{
                    width: `${(taskCounts.completed / taskCounts.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reflections wall */}
      {reflections.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(2,6,23,0.04)] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Quote className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">
              What sponsors are working on
            </h3>
            <span className="text-xs text-slate-400">
              ({reflections.length})
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {reflections.map(({ assessment, sponsor }) => (
              <Link
                key={assessment.id}
                to={`/admin/assessments/${assessment.sponsor_id}/${assessment.month}`}
                className="block px-4 py-3 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={sponsor?.name ?? '?'} size="sm" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 group-hover:text-sky-700">
                        {sponsor?.name ?? '—'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    {assessment.improvement_area && (
                      <Snippet
                        label="To improve"
                        text={assessment.improvement_area}
                      />
                    )}
                    {assessment.next_plan_of_action && (
                      <Snippet
                        label="Next plan"
                        text={assessment.next_plan_of_action}
                      />
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

type Tone = 'accent' | 'success' | 'warning' | 'info' | 'neutral'

const toneClasses: Record<Tone, { wrap: string; icon: string }> = {
  accent: { wrap: 'bg-sky-100 text-sky-700', icon: 'bg-sky-100 text-sky-700' },
  success: {
    wrap: 'bg-emerald-100 text-emerald-700',
    icon: 'bg-emerald-100 text-emerald-700',
  },
  warning: {
    wrap: 'bg-amber-100 text-amber-700',
    icon: 'bg-amber-100 text-amber-700',
  },
  info: {
    wrap: 'bg-indigo-100 text-indigo-700',
    icon: 'bg-indigo-100 text-indigo-700',
  },
  neutral: {
    wrap: 'bg-slate-100 text-slate-700',
    icon: 'bg-slate-100 text-slate-700',
  },
}

function Stat({
  icon,
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub?: string
  tone?: Tone
}) {
  const t = toneClasses[tone]
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(2,6,23,0.04)]">
      <div className="flex items-center gap-2">
        <div
          className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${t.icon}`}
        >
          {icon}
        </div>
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function Snippet({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </div>
      <div className="text-sm text-slate-700 line-clamp-2 whitespace-pre-wrap">
        {text}
      </div>
    </div>
  )
}
