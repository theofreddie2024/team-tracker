import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Crown,
  DollarSign,
  GraduationCap,
  Network,
  Sparkles,
  UserCog,
  UserMinus,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Member, Profile } from '../../lib/types'
import {
  INCOME_BRACKET_LABELS,
  STATUS_LABELS,
  STATUS_TONES,
} from '../../lib/types'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'

export default function AdminMemberDetail() {
  const { id } = useParams<{ id: string }>()
  const [member, setMember] = useState<Member | null>(null)
  const [sponsor, setSponsor] = useState<Profile | null>(null)
  const [recruiterProfile, setRecruiterProfile] = useState<Profile | null>(null)
  const [recruiterMember, setRecruiterMember] = useState<Member | null>(null)
  const [downline, setDownline] = useState<Member[]>([])
  const [promotedToProfile, setPromotedToProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let mounted = true
    supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!mounted) return
        const m = (data as Member | null) ?? null
        setMember(m)
        if (!m) {
          setLoading(false)
          return
        }

        const [ownerRes, recruiterUserRes, recruiterMemberRes, downlineRes, promotedRes] =
          await Promise.all([
            supabase
              .from('profiles')
              .select('*')
              .eq('id', m.account_owner_id)
              .maybeSingle(),
            m.recruited_by_user_id
              ? supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', m.recruited_by_user_id)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            m.recruited_by_member_id
              ? supabase
                  .from('members')
                  .select('*')
                  .eq('id', m.recruited_by_member_id)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            supabase
              .from('members')
              .select('*')
              .eq('recruited_by_member_id', m.id)
              .order('name'),
            supabase
              .from('profiles')
              .select('*')
              .eq('promoted_from_member_id', m.id)
              .maybeSingle(),
          ])

        if (!mounted) return
        setSponsor((ownerRes.data as Profile | null) ?? null)
        setRecruiterProfile((recruiterUserRes.data as Profile | null) ?? null)
        setRecruiterMember((recruiterMemberRes.data as Member | null) ?? null)
        setDownline((downlineRes.data as Member[] | null) ?? [])
        setPromotedToProfile((promotedRes.data as Profile | null) ?? null)
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [id])

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>

  if (!member) {
    return (
      <div className="space-y-6">
        <Link
          to="/admin/members"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all members
        </Link>
        <EmptyState
          title="Member not found"
          description="This member may have been deleted."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/members"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all members
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar name={member.name} size="lg" />
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {member.name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONES[member.status]}>
              {STATUS_LABELS[member.status]}
            </Badge>
            {member.is_trainer && (
              <Badge tone="info">
                <GraduationCap className="w-3 h-3 mr-0.5" />
                Trainer
              </Badge>
            )}
            {!member.is_active && <Badge tone="danger">Quit</Badge>}
            {promotedToProfile && (
              <Badge tone="accent">
                <Crown className="w-3 h-3 mr-0.5" />
                Promoted to sponsor
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Promoted-to banner */}
      {promotedToProfile && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Crown className="w-4 h-4" />
          </div>
          <div className="text-sm">
            <div className="font-semibold text-slate-900">
              Promoted to sponsor
            </div>
            <div className="text-slate-600 mt-0.5">
              Now running their own team as{' '}
              <Link
                to={`/admin/sponsors/${promotedToProfile.id}`}
                className="font-medium text-sky-700 hover:text-sky-900"
              >
                {promotedToProfile.name}
              </Link>
              .
            </div>
          </div>
        </div>
      )}

      {/* Lineage */}
      <Card>
        <SectionTitle>Lineage</SectionTitle>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Sponsor (account owner)
            </dt>
            <dd>
              {sponsor ? (
                <Link
                  to={`/admin/sponsors/${sponsor.id}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-sky-700"
                >
                  <Avatar name={sponsor.name} size="sm" />
                  {sponsor.name}
                </Link>
              ) : (
                <span className="text-sm text-slate-400">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              How they joined
            </dt>
            <dd className="text-sm">
              {recruiterProfile ? (
                <span className="inline-flex items-center gap-1.5">
                  <UserCog className="w-3.5 h-3.5 text-sky-600" />
                  Direct Leg — recruited by{' '}
                  <Link
                    to={`/admin/sponsors/${recruiterProfile.id}`}
                    className="font-medium text-sky-700 hover:text-sky-900"
                  >
                    {recruiterProfile.name}
                  </Link>
                </span>
              ) : recruiterMember ? (
                <span className="inline-flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-indigo-600" />
                  Success Line — recruited by{' '}
                  <Link
                    to={`/admin/members/${recruiterMember.id}`}
                    className="font-medium text-sky-700 hover:text-sky-900"
                  >
                    {recruiterMember.name}
                  </Link>
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Joined on
            </dt>
            <dd className="text-sm text-slate-800 inline-flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              {new Date(member.joined_at + 'T00:00:00').toLocaleDateString(
                undefined,
                { year: 'numeric', month: 'short', day: 'numeric' },
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Income
            </dt>
            <dd className="text-sm text-slate-800 inline-flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              {INCOME_BRACKET_LABELS[member.income_bracket]}
              {member.first_earnings_at && (
                <span className="text-xs text-slate-500 ml-1">
                  · first earned{' '}
                  {new Date(member.first_earnings_at + 'T00:00:00').toLocaleDateString()}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Quality signals */}
      <Card>
        <SectionTitle>Quality signals</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SignalRow
            label="Consistent distributor"
            value={member.is_consistent}
          />
          <SignalRow
            label="Attends office consistently"
            value={member.attends_office_consistently}
          />
          <SignalRow label="Trainer" value={member.is_trainer} />
        </div>
      </Card>

      {/* Quit info */}
      {!member.is_active && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <UserMinus className="w-4 h-4 text-rose-600" />
            <SectionTitle noMargin>Quit</SectionTitle>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Quit on
              </dt>
              <dd className="text-sm text-slate-800">
                {member.quit_at
                  ? new Date(member.quit_at + 'T00:00:00').toLocaleDateString()
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Reason
              </dt>
              <dd className="text-sm text-slate-800 whitespace-pre-wrap">
                {member.quit_reason ?? '—'}
              </dd>
            </div>
          </dl>
        </Card>
      )}

      {/* Direct downline (success line under this member) */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h2 className="text-base font-semibold text-slate-900">
            Recruited by this member{' '}
            <span className="text-slate-400 font-normal">
              ({downline.length})
            </span>
          </h2>
        </div>
        {downline.length === 0 ? (
          <EmptyState
            title="No recruits yet"
            description={`${member.name} hasn't recruited anyone yet.`}
          />
        ) : (
          <Card padded={false}>
            {downline.map((d, i) => (
              <Link
                key={d.id}
                to={`/admin/members/${d.id}`}
                className={`flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group ${
                  i > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <Avatar name={d.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-semibold truncate ${
                        d.is_active
                          ? 'text-slate-900 group-hover:text-sky-700'
                          : 'text-slate-400 line-through'
                      }`}
                    >
                      {d.name}
                    </span>
                    <Badge tone={STATUS_TONES[d.status]}>
                      {STATUS_LABELS[d.status]}
                    </Badge>
                    {!d.is_active && <Badge tone="danger">Quit</Badge>}
                  </div>
                </div>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}

function SectionTitle({
  children,
  noMargin,
}: {
  children: React.ReactNode
  noMargin?: boolean
}) {
  return (
    <h2
      className={`text-sm font-semibold text-slate-900 uppercase tracking-wider ${
        noMargin ? '' : 'mb-4'
      }`}
    >
      {children}
    </h2>
  )
}

function SignalRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        value
          ? 'border-emerald-200 bg-emerald-50/60'
          : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={`text-sm font-semibold mt-0.5 ${
          value ? 'text-emerald-700' : 'text-slate-400'
        }`}
      >
        {value ? 'Yes' : 'No'}
      </div>
    </div>
  )
}
