import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UserCog,
  Users,
  UserCheck,
  Mail,
  ArrowRight,
  TrendingUp,
  Award,
  GraduationCap,
  Crown,
  DollarSign,
  Sparkles,
  UserMinus,
  Presentation,
  ClipboardList,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Member, MonthlyAssessment, Training } from '../../lib/types'
import { currentMonthKey, formatMonthLabel } from '../../lib/types'
import { computeMetrics, computeTrainingMetrics } from '../../lib/metrics'
import StatCard from '../../components/ui/StatCard'
import SectionCard from '../../components/metrics/SectionCard'
import MetricRow from '../../components/metrics/MetricRow'

export default function AdminDashboard() {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [trainings, setTrainings] = useState<Training[] | null>(null)
  const [sponsorCount, setSponsorCount] = useState<number | null>(null)
  const [pendingInvites, setPendingInvites] = useState<number | null>(null)
  const [submittedThisMonth, setSubmittedThisMonth] = useState<number | null>(
    null,
  )
  const monthKey = currentMonthKey()

  useEffect(() => {
    let mounted = true
    Promise.all([
      supabase.from('members').select('*'),
      supabase.from('trainings').select('*'),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'sponsor'),
      supabase
        .from('invitations')
        .select('*', { count: 'exact', head: true })
        .is('accepted_at', null),
      supabase
        .from('monthly_assessments')
        .select('*', { count: 'exact', head: true })
        .eq('month', monthKey),
    ]).then(([m, t, s, inv, a]) => {
      if (!mounted) return
      setMembers((m.data as Member[] | null) ?? [])
      setTrainings((t.data as Training[] | null) ?? [])
      setSponsorCount(s.count ?? 0)
      setPendingInvites(inv.count ?? 0)
      setSubmittedThisMonth(a.count ?? 0)
    })
    return () => {
      mounted = false
    }
  }, [monthKey])

  const loading = members === null
  const trainingsLoading = trainings === null
  const metrics = useMemo(
    () => (members ? computeMetrics(members) : null),
    [members],
  )
  const tm = useMemo(
    () => (trainings ? computeTrainingMetrics(trainings) : null),
    [trainings],
  )
  const m = metrics

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Organization overview
        </h1>
        <p className="text-slate-500 mt-1.5">
          The full picture across all sponsors and members.
        </p>
      </div>

      {/* Top-level org stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Sponsors"
          value={sponsorCount ?? undefined}
          loading={sponsorCount === null}
          icon={<UserCog className="w-4 h-4" />}
          tone="accent"
        />
        <StatCard
          label="Total members"
          value={m?.total}
          loading={loading}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Active"
          value={m?.active}
          loading={loading}
          icon={<UserCheck className="w-4 h-4" />}
          tone="success"
        />
        <StatCard
          label="Pending invites"
          value={pendingInvites ?? undefined}
          loading={pendingInvites === null}
          icon={<Mail className="w-4 h-4" />}
          tone="warning"
        />
      </div>

      {/* Composition */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
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
                label="Direct-leg distributors"
                value={m!.personalDistributors}
                hint="Recruited directly by a sponsor"
              />
              <MetricRow
                label="Total distributors"
                value={m!.teamDistributors}
              />
              <MetricRow
                label="Consistent (direct)"
                value={m!.consistentPersonal}
                total={m!.personalDistributors}
              />
              <MetricRow
                label="Consistent (total)"
                value={m!.consistentTeam}
                total={m!.teamDistributors}
              />
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
              No quitters across the org.
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 tabular-nums">
                  {m!.quitters}
                </span>
                <span className="text-sm text-slate-500">across the org</span>
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

      {/* Trainings overview */}
      <SectionCard
        title="Trainings (this month)"
        icon={<Presentation className="w-4 h-4" />}
      >
        {trainingsLoading ? (
          <SkeletonRows />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5">
            <MetricRow
              label="Guest trainings"
              value={tm!.byTypeThisMonth.guest}
              hint={
                tm!.guestAttendeesThisMonth > 0
                  ? `${tm!.guestAttendeesThisMonth} attendee${tm!.guestAttendeesThisMonth === 1 ? '' : 's'} total`
                  : undefined
              }
            />
            <MetricRow label="Pro trainings" value={tm!.byTypeThisMonth.pro} />
            <MetricRow
              label="Distributor trainings"
              value={tm!.byTypeThisMonth.distributor}
            />
            <MetricRow label="This week" value={tm!.thisWeek} />
          </div>
        )}
        <div className="mt-5 pt-3 border-t border-slate-100">
          <Link
            to="/admin/trainings"
            className="text-sm text-sky-700 hover:text-sky-900 font-semibold inline-flex items-center gap-1"
          >
            View all trainings <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </SectionCard>

      {/* Monthly assessment status */}
      <Link to="/admin/assessments" className="block group">
        <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(2,6,23,0.04)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_6px_18px_-6px_rgba(2,6,23,0.12)]">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900">
                {formatMonthLabel(monthKey)} assessments
              </div>
              <div className="text-sm text-slate-600 mt-0.5">
                {submittedThisMonth === null || sponsorCount === null ? (
                  '…'
                ) : (
                  <>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {submittedThisMonth}
                    </span>
                    {' / '}
                    <span className="font-bold text-slate-900 tabular-nums">
                      {sponsorCount}
                    </span>{' '}
                    sponsor{sponsorCount === 1 ? '' : 's'} submitted
                  </>
                )}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </Link>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <Link to="/admin/sponsors" className="group">
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(2,6,23,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-6px_rgba(2,6,23,0.12)]">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Manage sponsors</div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Invite new sponsors and review pending invitations
                </div>
                {(pendingInvites ?? 0) > 0 && (
                  <div className="mt-2 text-xs font-medium text-amber-700">
                    {pendingInvites} pending invite
                    {pendingInvites === 1 ? '' : 's'}
                  </div>
                )}
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </Link>
        <Link to="/admin/members" className="group">
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(2,6,23,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-6px_rgba(2,6,23,0.12)]">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">All members</div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Browse every member across the organization
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
