import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthProvider'
import {
  formatMonthLabel,
  isValidMonth,
  shiftMonth,
  type MonthlyAssessment,
} from '../../lib/types'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { Field, Input, Textarea } from '../../components/ui/Input'
import WeeklyTaskSummary from '../../components/WeeklyTaskSummary'

interface FormState {
  prospects_count: string
  prospects_stayed: string
  pro_trainings_attended: string
  pro_trainings_missed: string
  distributor_trainings_attended: string
  distributor_trainings_missed: string
  gigs_researched: string
  improvement_area: string
  next_plan_of_action: string
}

const emptyForm: FormState = {
  prospects_count: '',
  prospects_stayed: '',
  pro_trainings_attended: '',
  pro_trainings_missed: '',
  distributor_trainings_attended: '',
  distributor_trainings_missed: '',
  gigs_researched: '',
  improvement_area: '',
  next_plan_of_action: '',
}

const toInt = (v: string) => Math.max(0, parseInt(v, 10) || 0)

export default function AssessmentForm() {
  const { month: monthParam } = useParams<{ month: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const monthValid = monthParam ? isValidMonth(monthParam) : false

  const [form, setForm] = useState<FormState>(emptyForm)
  const [existing, setExisting] = useState<MonthlyAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.id || !monthValid) {
      setLoading(false)
      return
    }
    let mounted = true
    supabase
      .from('monthly_assessments')
      .select('*')
      .eq('sponsor_id', profile.id)
      .eq('month', monthParam!)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return
        if (data) {
          const a = data as MonthlyAssessment
          setExisting(a)
          setForm({
            prospects_count: String(a.prospects_count),
            prospects_stayed: String(a.prospects_stayed),
            pro_trainings_attended: String(a.pro_trainings_attended),
            pro_trainings_missed: String(a.pro_trainings_missed),
            distributor_trainings_attended: String(
              a.distributor_trainings_attended,
            ),
            distributor_trainings_missed: String(a.distributor_trainings_missed),
            gigs_researched: String(a.gigs_researched),
            improvement_area: a.improvement_area ?? '',
            next_plan_of_action: a.next_plan_of_action ?? '',
          })
        }
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [profile?.id, monthParam, monthValid])

  if (!monthValid) return <Navigate to="/assessments" replace />

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setError(null)
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const payload = {
        sponsor_id: profile.id,
        month: monthParam!,
        prospects_count: toInt(form.prospects_count),
        prospects_stayed: toInt(form.prospects_stayed),
        pro_trainings_attended: toInt(form.pro_trainings_attended),
        pro_trainings_missed: toInt(form.pro_trainings_missed),
        distributor_trainings_attended: toInt(
          form.distributor_trainings_attended,
        ),
        distributor_trainings_missed: toInt(form.distributor_trainings_missed),
        gigs_researched: toInt(form.gigs_researched),
        improvement_area: form.improvement_area.trim() || null,
        next_plan_of_action: form.next_plan_of_action.trim() || null,
        submitted_at: existing?.submitted_at ?? now,
      }
      const { data, error } = await supabase
        .from('monthly_assessments')
        .upsert(payload, { onConflict: 'sponsor_id,month' })
        .select()
        .single()
      if (error) {
        setError(error.message)
        return
      }
      setExisting(data as MonthlyAssessment)
      setSavedAt(now)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>

  const monthLabel = formatMonthLabel(monthParam!)

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        to="/assessments"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to assessments
      </Link>

      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          {monthLabel} assessment
        </h1>
        <div className="flex items-center gap-2">
          <Link
            to={`/assessments/${shiftMonth(monthParam!, -1)}`}
            className="text-sm text-slate-500 hover:text-slate-900 font-medium"
          >
            ← Prev month
          </Link>
        </div>
      </div>

      {existing?.submitted_at && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Submitted{' '}
          {new Date(existing.submitted_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
          . Edits update the submission.
        </div>
      )}
      {savedAt && (
        <div className="rounded-xl bg-sky-50 border border-sky-200 px-4 py-3 text-sm text-sky-800">
          Saved {new Date(savedAt).toLocaleTimeString()}.
        </div>
      )}

      {profile?.id && (
        <WeeklyTaskSummary
          monthKey={monthParam!}
          sponsorId={profile.id}
          withLink
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <SectionTitle>Prospecting</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="People you prospected">
              <Input
                type="number"
                min={0}
                value={form.prospects_count}
                onChange={(e) => update('prospects_count', e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="How many stayed">
              <Input
                type="number"
                min={0}
                value={form.prospects_stayed}
                onChange={(e) => update('prospects_stayed', e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle>Your training attendance</SectionTitle>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Pro trainings attended">
                <Input
                  type="number"
                  min={0}
                  value={form.pro_trainings_attended}
                  onChange={(e) =>
                    update('pro_trainings_attended', e.target.value)
                  }
                  placeholder="0"
                />
              </Field>
              <Field label="Pro trainings missed">
                <Input
                  type="number"
                  min={0}
                  value={form.pro_trainings_missed}
                  onChange={(e) =>
                    update('pro_trainings_missed', e.target.value)
                  }
                  placeholder="0"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Distributor trainings attended">
                <Input
                  type="number"
                  min={0}
                  value={form.distributor_trainings_attended}
                  onChange={(e) =>
                    update('distributor_trainings_attended', e.target.value)
                  }
                  placeholder="0"
                />
              </Field>
              <Field label="Distributor trainings missed">
                <Input
                  type="number"
                  min={0}
                  value={form.distributor_trainings_missed}
                  onChange={(e) =>
                    update('distributor_trainings_missed', e.target.value)
                  }
                  placeholder="0"
                />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>Activity</SectionTitle>
          <Field
            label="Gigs researched this month"
            hint="How many opportunities did you research?"
          >
            <Input
              type="number"
              min={0}
              value={form.gigs_researched}
              onChange={(e) => update('gigs_researched', e.target.value)}
              placeholder="0"
            />
          </Field>
        </Card>

        <Card>
          <SectionTitle>Reflection</SectionTitle>
          <div className="space-y-4">
            <Field
              label="What can you improve this month to achieve 2x?"
              hint="One area to focus on"
            >
              <Textarea
                value={form.improvement_area}
                onChange={(e) => update('improvement_area', e.target.value)}
                placeholder="e.g. consistency in daily prospecting, follow-ups…"
              />
            </Field>
            <Field label="Your next plan of action">
              <Textarea
                value={form.next_plan_of_action}
                onChange={(e) => update('next_plan_of_action', e.target.value)}
                placeholder="What concrete steps are you taking next?"
              />
            </Field>
          </div>
        </Card>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button type="submit" variant="accent" size="lg" loading={saving}>
            {existing ? 'Update assessment' : 'Submit assessment'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/assessments')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
      {children}
    </h2>
  )
}
