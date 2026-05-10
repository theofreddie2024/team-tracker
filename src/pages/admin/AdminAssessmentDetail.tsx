import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ListTodo } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  formatMonthLabel,
  isValidMonth,
  type MonthlyAssessment,
  type Profile,
} from '../../lib/types'
import Card from '../../components/ui/Card'
import Avatar from '../../components/ui/Avatar'
import EmptyState from '../../components/ui/EmptyState'
import WeeklyTasksSection from '../../components/WeeklyTasksSection'
import WeeklyTaskSummary from '../../components/WeeklyTaskSummary'

export default function AdminAssessmentDetail() {
  const { sponsorId, month } = useParams<{ sponsorId: string; month: string }>()
  const [assessment, setAssessment] = useState<MonthlyAssessment | null>(null)
  const [sponsor, setSponsor] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sponsorId || !month || !isValidMonth(month)) return
    let mounted = true
    Promise.all([
      supabase
        .from('monthly_assessments')
        .select('*')
        .eq('sponsor_id', sponsorId)
        .eq('month', month)
        .maybeSingle(),
      supabase.from('profiles').select('*').eq('id', sponsorId).maybeSingle(),
    ]).then(([a, p]) => {
      if (!mounted) return
      setAssessment((a.data as MonthlyAssessment | null) ?? null)
      setSponsor((p.data as Profile | null) ?? null)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [sponsorId, month])

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>

  if (!assessment) {
    return (
      <div className="space-y-6">
        <Link
          to="/admin/assessments"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to assessments
        </Link>
        <EmptyState
          title="Assessment not found"
          description="This sponsor hasn't submitted for this month."
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        to="/admin/assessments"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to assessments
      </Link>

      <div className="flex items-center gap-4">
        <Avatar name={sponsor?.name ?? '?'} size="lg" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {sponsor?.name ?? 'Unknown sponsor'}
          </h1>
          <p className="text-slate-500 inline-flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            {formatMonthLabel(assessment.month)}
            {assessment.submitted_at && (
              <>
                <span>·</span>
                <span>
                  Submitted{' '}
                  {new Date(assessment.submitted_at).toLocaleDateString()}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <WeeklyTaskSummary
        monthKey={assessment.month}
        sponsorId={assessment.sponsor_id}
      />

      <Card>
        <SectionTitle>Prospecting</SectionTitle>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Stat label="People prospected" value={assessment.prospects_count} />
          <Stat label="Stayed" value={assessment.prospects_stayed} />
        </div>
      </Card>

      <Card>
        <SectionTitle>Training attendance</SectionTitle>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Stat
            label="Pro trainings attended"
            value={assessment.pro_trainings_attended}
          />
          <Stat
            label="Pro trainings missed"
            value={assessment.pro_trainings_missed}
          />
          <Stat
            label="Distributor trainings attended"
            value={assessment.distributor_trainings_attended}
          />
          <Stat
            label="Distributor trainings missed"
            value={assessment.distributor_trainings_missed}
          />
        </div>
      </Card>

      <Card>
        <SectionTitle>Activity</SectionTitle>
        <Stat label="Gigs researched" value={assessment.gigs_researched} />
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <ListTodo className="w-4 h-4 text-slate-500" />
          <SectionTitle noMargin>Weekly member tasks</SectionTitle>
        </div>
        <WeeklyTasksSection
          monthKey={assessment.month}
          sponsorId={assessment.sponsor_id}
          readOnly
        />
      </Card>

      {(assessment.improvement_area || assessment.next_plan_of_action) && (
        <Card>
          <SectionTitle>Reflection</SectionTitle>
          <div className="space-y-4">
            {assessment.improvement_area && (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Area to improve for 2x
                </div>
                <div className="text-sm text-slate-800 whitespace-pre-wrap">
                  {assessment.improvement_area}
                </div>
              </div>
            )}
            {assessment.next_plan_of_action && (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Next plan of action
                </div>
                <div className="text-sm text-slate-800 whitespace-pre-wrap">
                  {assessment.next_plan_of_action}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

function SectionTitle({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <h2 className={`text-sm font-semibold text-slate-900 uppercase tracking-wider ${noMargin ? '' : 'mb-4'}`}>
      {children}
    </h2>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
        {value}
      </div>
    </div>
  )
}
