import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Users, UserCheck, Network, Sparkles, Crown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Member, Profile } from '../../lib/types'
import { STATUS_LABELS, STATUS_TONES } from '../../lib/types'
import Card from '../../components/ui/Card'
import StatCard from '../../components/ui/StatCard'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'

interface PromotionInfo {
  memberName: string
  originalSponsorId: string | null
  originalSponsorName: string | null
}

export default function AdminSponsorDetail() {
  const { id } = useParams<{ id: string }>()
  const [sponsor, setSponsor] = useState<Profile | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [promotion, setPromotion] = useState<PromotionInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let mounted = true
    Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('members')
        .select('*')
        .eq('account_owner_id', id)
        .order('created_at', { ascending: false }),
    ]).then(async ([s, m]) => {
      if (!mounted) return
      const sp = (s.data as Profile | null) ?? null
      setSponsor(sp)
      setMembers((m.data as Member[] | null) ?? [])

      if (sp?.promoted_from_member_id) {
        const { data: mem } = await supabase
          .from('members')
          .select('name, account_owner_id')
          .eq('id', sp.promoted_from_member_id)
          .maybeSingle()
        const memRow = mem as { name: string; account_owner_id: string } | null
        if (memRow && mounted) {
          const { data: orig } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('id', memRow.account_owner_id)
            .maybeSingle()
          const origRow = orig as { id: string; name: string } | null
          if (mounted) {
            setPromotion({
              memberName: memRow.name,
              originalSponsorId: origRow?.id ?? null,
              originalSponsorName: origRow?.name ?? null,
            })
          }
        }
      }
      if (mounted) setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [id])

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>
  if (!sponsor)
    return (
      <EmptyState
        title="Sponsor not found"
        description="This sponsor may have been removed."
      />
    )

  const directLeg = members.filter((m) => m.recruited_by_user_id === sponsor.id)
  const successLine = members.filter((m) => m.recruited_by_member_id !== null)
  const active = members.filter((m) => m.is_active)

  return (
    <div className="space-y-6">
      <Link
        to="/admin/sponsors"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sponsors
      </Link>

      <div className="flex items-center gap-4">
        <Avatar name={sponsor.name} size="lg" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {sponsor.name}
          </h1>
          <p className="text-slate-500">{sponsor.email}</p>
        </div>
      </div>

      {promotion && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Crown className="w-4 h-4" />
          </div>
          <div className="text-sm">
            <div className="font-semibold text-slate-900">
              Promoted from member: {promotion.memberName}
            </div>
            {promotion.originalSponsorId && promotion.originalSponsorName && (
              <div className="text-slate-600 mt-0.5">
                Originally on{' '}
                <Link
                  to={`/admin/sponsors/${promotion.originalSponsorId}`}
                  className="font-medium text-sky-700 hover:text-sky-900"
                >
                  {promotion.originalSponsorName}
                </Link>
                's team.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total members"
          value={members.length}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Active"
          value={active.length}
          icon={<UserCheck className="w-4 h-4" />}
          tone="success"
        />
        <StatCard
          label="Direct Leg"
          value={directLeg.length}
          icon={<Sparkles className="w-4 h-4" />}
        />
        <StatCard
          label="Success Line"
          value={successLine.length}
          icon={<Network className="w-4 h-4" />}
        />
      </div>

      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          Members{' '}
          <span className="text-slate-400 font-normal">({members.length})</span>
        </h2>
        {members.length === 0 ? (
          <EmptyState
            icon={<Users className="w-5 h-5" />}
            title="No members yet"
            description="This sponsor hasn't added anyone to their team."
          />
        ) : (
          <Card padded={false}>
            {members.map((m, i) => (
              <div
                key={m.id}
                className={`flex items-center gap-3 p-4 ${
                  i > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <Avatar name={m.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 truncate">
                      {m.name}
                    </span>
                    <Badge tone={STATUS_TONES[m.status]}>{STATUS_LABELS[m.status]}</Badge>
                    {m.is_trainer && <Badge tone="info">Trainer</Badge>}
                    {!m.is_active && <Badge tone="danger">Quit</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {m.recruited_by_user_id ? 'Direct Leg' : 'Success Line'}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}
