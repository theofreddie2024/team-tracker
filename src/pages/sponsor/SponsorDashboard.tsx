import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  UserPlus,
  TrendingUp,
  GraduationCap,
  Award,
  UserMinus,
  Network,
  ArrowRight,
  DollarSign,
  Sparkles,
  Crown,
  Presentation,
  Plus,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthProvider'
import type { Member, MonthlyAssessment, Training } from '../../lib/types'
import { currentMonthKey, formatMonthLabel } from '../../lib/types'
import { computeMetrics, computeTrainingMetrics } from '../../lib/metrics'
import StatCard from '../../components/ui/StatCard'
import Button from '../../components/ui/Button'
import SectionCard from '../../components/metrics/SectionCard'
import MetricRow from '../../components/metrics/MetricRow'

export default function SponsorDashboard() {
  const { profile } = useAuth()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [trainings, setTrainings] = useState<Training[] | null>(null)
  const [thisMonthAssessment, setThisMonthAssessment] =
    useState<MonthlyAssessment | null | undefined>(undefined)
  const monthKey = currentMonthKey()

  useEffect(() => {
    if (!profile?.id) return
    let mounted = true
    Promise.all([
      supabase.from('members').select('*').eq('account_owner_id', profile.id),
      supabase
        .from('trainings')
        .select('*')
        .eq('account_owner_id', profile.id)
        .order('date', { ascending: false }),
      supabase
        .from('monthly_assessments')
        .select('*')
        .eq('sponsor_id', profile.id)
        .eq('month', monthKey)
        .maybeSingle(),
    ]).then(([mRes, tRes, aRes]) => {
      if (!mounted) return
      setMembers((mRes.data as Member[] | null) ?? [])
      setTrainings((tRes.data as Training[] | null) ?? [])
      setThisMonthAssessment((aRes.data as MonthlyAssessment | null) ?? null)
    })
    return () => {
      mounted = false
    }
  }, [profile?.id, monthKey])

  const loading = members === null
  const trainingsLoading = trainings === null
  const metrics = useMemo(
    () =>
      members && profile?.id
        ? computeMetrics(members, { sponsorId: profile.id })
        : null,
    [members, profile?.id],
  )
  const tm = useMemo(
    () => (trainings ? computeTrainingMetrics(trainings) : null),
    [trainings],
  )

  const m = metrics

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {profile?.name?.split(' ')[0] ?? ''}
          </h1>
          <p className="text-slate-500 mt-1.5">
            Here's a snapshot of your team today.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/members/new">
            <Button variant="accent" leftIcon={<UserPlus className="w-4 h-4" />}>
              Add member
            </Button>
          </Link>
          <Link to="/members">
            <Button
              variant="secondary"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Manage team
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero bento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 auto-rows-[1fr]">
        <div className="col-span-2 md:row-span-2">
          <div className="relative overflow-hidden h-full rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-sky-700 via-sky-800 to-slate-900 text-white shadow-[0_8px_24px_-8px_rgba(2,6,23,0.25)]">
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -right-8 bottom-0 w-32 h-32 rounded-full bg-sky-300/10 blur-xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/70">
                <Users className="w-4 h-4" />
                Total team
              </div>
              <div className="mt-4 text-6xl sm:text-7xl font-bold tracking-tight tabular-nums">
                {loading ? (
                  <span className="inline-block h-16 w-28 rounded bg-white/20 animate-pulse" />
                ) : (
                  m?.total ?? 0
                )}
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm text-white/80">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {m?.active ?? 0} active
                </span>
                {(m?.quitters ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    {m?.quitters} quit
                  </span>
                )}
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
                <div className="rounded-xl bg-white/10 backdrop-blur p-3">
                  <div className="text-xs text-white/70 uppercase tracking-wider">
                    Direct Leg
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">
                    {m?.directLeg ?? 0}
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur p-3">
                  <div className="text-xs text-white/70 uppercase tracking-wider">
                    Success Line
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">
                    {m?.successLine ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <StatCard
          label="Newbies"
          value={m?.newbies}
          loading={loading}
          icon={<TrendingUp className="w-4 h-4" />}
          tone="success"
        />
        <StatCard
          label="Pros"
          value={m?.pros}
          loading={loading}
          icon={<Award className="w-4 h-4" />}
        />
        <StatCard
          label="Trainers"
          value={m?.trainers}
          loading={loading}
          hint="across all ranks"
          icon={<GraduationCap className="w-4 h-4" />}
        />
        <StatCard
          label="Distributors"
          value={m?.distributors}
          loading={loading}
          icon={<Crown className="w-4 h-4" />}
          tone="accent"
        />
      </div>

      {/* Earnings + Distributors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <SectionCard
          title="Earnings distribution"
          icon={<DollarSign className="w-4 h-4" />}
        >
          {loading ? (
            <SkeletonRows />
          ) : (
            <div className="space-y-3.5">
              <MetricRow
                label="$250–500/mo"
                value={m!.earningsByBracket['250_500']}
                bar={{
                  value: m!.earningsByBracket['250_500'],
                  max: Math.max(1, m!.active),
                  tone: 'success',
                }}
              />
              <MetricRow
                label="$500–1000/mo"
                value={m!.earningsByBracket['500_1000']}
                bar={{
                  value: m!.earningsByBracket['500_1000'],
                  max: Math.max(1, m!.active),
                  tone: 'success',
                }}
              />
              <MetricRow
                label="$1000+/mo"
                value={m!.earningsByBracket['1000_plus']}
                bar={{
                  value: m!.earningsByBracket['1000_plus'],
                  max: Math.max(1, m!.active),
                  tone: 'accent',
                }}
              />
              <MetricRow
                label="Occasional (~once/3mo)"
                value={m!.earningsByBracket.occasional}
                bar={{
                  value: m!.earningsByBracket.occasional,
                  max: Math.max(1, m!.active),
                  tone: 'warning',
                }}
              />
              <div className="pt-3 mt-1 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total earning members
                </span>
                <span className="text-lg font-bold text-slate-900 tabular-nums">
                  {m!.earningTotal}
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    / {m!.active}
                  </span>
                </span>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Distributors" icon={<Crown className="w-4 h-4" />}>
          {loading ? (
            <SkeletonRows />
          ) : (
            <div className="space-y-3.5">
              <MetricRow
                label="Personal Distributors"
                value={m!.personalDistributors}
                hint="Distributors you recruited directly"
              />
              <MetricRow
                label="Team Distributors"
                value={m!.teamDistributors}
                hint="Personal + Success Line"
              />
              <MetricRow
                label="Consistent (Personal)"
                value={m!.consistentPersonal}
                total={m!.personalDistributors}
              />
              <MetricRow
                label="Consistent (Team)"
                value={m!.consistentTeam}
                total={m!.teamDistributors}
              />
              <div className="pt-3 mt-1 border-t border-slate-100">
                <MetricRow
                  label="Inconsistent (Personal)"
                  value={m!.inconsistentPersonal}
                />
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Quality + Quitters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <SectionCard
          title="Quality signals"
          icon={<Sparkles className="w-4 h-4" />}
        >
          {loading ? (
            <SkeletonRows />
          ) : (
            <div className="space-y-3.5">
              <MetricRow
                label="Attending office consistently"
                value={m!.attendingOffice}
                total={m!.active}
              />
              <MetricRow
                label="Consistent overall"
                value={m!.consistentTotal}
                total={m!.active}
              />
              <MetricRow
                label="Newbies with first earnings"
                value={m!.newbiesWithEarnings}
                total={m!.newbies}
              />
            </div>
          )}
        </SectionCard>

        <SectionCard title="Quitters" icon={<UserMinus className="w-4 h-4" />}>
          {loading ? (
            <SkeletonRows />
          ) : m!.quitters === 0 ? (
            <div className="text-sm text-slate-500 py-4 text-center">
              No one has quit your team. 🎯
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 tabular-nums">
                  {m!.quitters}
                </span>
                <span className="text-sm text-slate-500">total quitters</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Reasons
                </div>
                <div className="space-y-1.5">
                  {m!.quitReasons.map(({ reason, count }) => (
                    <div
                      key={reason}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span className="text-slate-700 truncate">{reason}</span>
                      <span className="shrink-0 font-semibold text-slate-900 tabular-nums">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Trainings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <SectionCard
          title="Trainings (this month)"
          icon={<Presentation className="w-4 h-4" />}
        >
          {trainingsLoading ? (
            <SkeletonRows />
          ) : (
            <div className="space-y-3.5">
              <MetricRow
                label="Guest trainings"
                value={tm!.byTypeThisMonth.guest}
                hint={
                  tm!.guestAttendeesThisMonth > 0
                    ? `${tm!.guestAttendeesThisMonth} attendee${tm!.guestAttendeesThisMonth === 1 ? '' : 's'} total`
                    : undefined
                }
              />
              <MetricRow
                label="Pro trainings"
                value={tm!.byTypeThisMonth.pro}
              />
              <MetricRow
                label="Distributor trainings"
                value={tm!.byTypeThisMonth.distributor}
              />
              <div className="pt-3 mt-1 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  This week
                </span>
                <span className="text-lg font-bold text-slate-900 tabular-nums">
                  {tm!.thisWeek}
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    training{tm!.thisWeek === 1 ? '' : 's'}
                  </span>
                </span>
              </div>
            </div>
          )}
        </SectionCard>

        <Link to="/trainings/new" className="group">
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(2,6,23,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-6px_rgba(2,6,23,0.12)] flex flex-col">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Log a training</div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Capture today's guest, pro, or distributor session
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
            </div>
            {!trainingsLoading && (trainings?.length ?? 0) > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Recent
                </div>
                {trainings!.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="text-sm text-slate-700 truncate flex items-baseline justify-between gap-3"
                  >
                    <span className="truncate">
                      <span className="text-slate-400 mr-1.5">
                        {new Date(t.date + 'T00:00:00').toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {t.title}
                    </span>
                    {t.attendee_count > 0 && (
                      <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                        {t.attendee_count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Monthly assessment */}
      <Link to={`/assessments/${monthKey}`} className="block group">
        <div
          className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(2,6,23,0.04),0_8px_24px_-8px_rgba(2,6,23,0.06)] transition-all duration-200 group-hover:-translate-y-0.5 ${
            thisMonthAssessment?.submitted_at
              ? 'bg-white border border-emerald-200'
              : 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                thisMonthAssessment?.submitted_at
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {thisMonthAssessment?.submitted_at ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <ClipboardList className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900">
                {formatMonthLabel(monthKey)} assessment
              </div>
              <div className="text-sm text-slate-600 mt-0.5">
                {thisMonthAssessment === undefined
                  ? '…'
                  : thisMonthAssessment?.submitted_at
                    ? `Submitted ${new Date(thisMonthAssessment.submitted_at).toLocaleDateString()} — tap to view or update`
                    : 'Not submitted yet — answer your monthly self-report'}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </Link>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <Link to="/members/new" className="group">
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(2,6,23,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-6px_rgba(2,6,23,0.12)]">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Add a member</div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Track someone new on your team
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </Link>
        <Link to="/members" className="group">
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(2,6,23,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-6px_rgba(2,6,23,0.12)]">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Network className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">View your team</div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Browse Direct Leg and Success Line
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-3.5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-1.5 animate-pulse">
          <div className="flex justify-between">
            <div className="h-3 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-200 rounded w-8" />
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full" />
        </div>
      ))}
    </div>
  )
}
