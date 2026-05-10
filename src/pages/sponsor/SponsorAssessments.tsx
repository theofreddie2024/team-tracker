import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthProvider'
import {
  currentMonthKey,
  formatMonthLabel,
  type MonthlyAssessment,
} from '../../lib/types'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'

export default function SponsorAssessments() {
  const { profile } = useAuth()
  const [list, setList] = useState<MonthlyAssessment[] | null>(null)
  const month = currentMonthKey()

  useEffect(() => {
    if (!profile?.id) return
    let mounted = true
    supabase
      .from('monthly_assessments')
      .select('*')
      .eq('sponsor_id', profile.id)
      .order('month', { ascending: false })
      .then(({ data }) => {
        if (!mounted) return
        setList((data as MonthlyAssessment[] | null) ?? [])
      })
    return () => {
      mounted = false
    }
  }, [profile?.id])

  const thisMonth = list?.find((a) => a.month === month) ?? null
  const past = (list ?? []).filter((a) => a.month !== month)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Monthly assessments
        </h1>
        <p className="text-slate-500 mt-1.5">
          Senior-manager self-report. Track prospecting, training attendance,
          and your monthly reflection.
        </p>
      </div>

      {/* This month CTA */}
      <Link to={`/assessments/${month}`} className="block group">
        <div
          className={`relative overflow-hidden rounded-2xl p-6 sm:p-7 shadow-[0_8px_24px_-8px_rgba(2,6,23,0.18)] transition-all duration-200 group-hover:-translate-y-0.5 ${
            thisMonth?.submitted_at
              ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 text-white'
              : 'bg-gradient-to-br from-sky-700 via-sky-800 to-slate-900 text-white'
          }`}
        >
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/70">
                <Calendar className="w-4 h-4" />
                This month
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
                {formatMonthLabel(month)}
              </div>
              <div className="mt-3 text-sm text-white/85">
                {thisMonth?.submitted_at ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Submitted{' '}
                    {new Date(thisMonth.submitted_at).toLocaleDateString(
                      undefined,
                      { month: 'short', day: 'numeric' },
                    )}
                    . Tap to view or update.
                  </span>
                ) : (
                  'Not submitted yet — answer the questions when you have a moment.'
                )}
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-white/80 mt-1 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>

      {/* Past months */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          Past assessments{' '}
          <span className="text-slate-400 font-normal">({past.length})</span>
        </h2>
        {list === null ? (
          <Card>
            <div className="text-sm text-slate-500">Loading…</div>
          </Card>
        ) : past.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-5 h-5" />}
            title="No past assessments"
            description="Once you submit for a month, it'll appear here."
          />
        ) : (
          <Card padded={false}>
            {past.map((a, i) => (
              <Link
                key={a.id}
                to={`/assessments/${a.month}`}
                className={`flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group ${
                  i > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">
                    {formatMonthLabel(a.month)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {a.submitted_at
                      ? `Submitted ${new Date(a.submitted_at).toLocaleDateString()}`
                      : 'Draft'}
                    {' · '}
                    {a.prospects_count} prospects · {a.gigs_researched} gigs
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}
