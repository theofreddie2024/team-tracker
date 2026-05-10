import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown, Network, ShieldCheck, UserCog, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Member, Profile } from '../../lib/types'
import { STATUS_LABELS, STATUS_TONES } from '../../lib/types'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'

type OrgNode = ProfileNode | MemberNode

interface ProfileNode {
  kind: 'profile'
  profile: Profile
  memberCount: number
  promotedFromName: string | null
  descendantCount: number
  children: OrgNode[]
}

interface MemberNode {
  kind: 'member'
  member: Member
  descendantCount: number
  children: MemberNode[]
}

export default function AdminOrgTree() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true }),
      supabase.from('members').select('*'),
    ]).then(([p, m]) => {
      if (!mounted) return
      setProfiles((p.data as Profile[] | null) ?? [])
      setMembers((m.data as Member[] | null) ?? [])
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  const tree = useMemo<OrgNode[]>(() => {
    if (profiles.length === 0) return []

    const profileById = new Map(profiles.map((p) => [p.id, p]))
    const memberById = new Map(members.map((m) => [m.id, m]))

    // Profiles indexed by inviter (sponsor lineage)
    const profilesByInviter = new Map<string | null, Profile[]>()
    for (const p of profiles) {
      const key =
        p.invited_by_user_id && profileById.has(p.invited_by_user_id)
          ? p.invited_by_user_id
          : null
      const list = profilesByInviter.get(key)
      if (list) list.push(p)
      else profilesByInviter.set(key, [p])
    }

    // Members indexed by parent member id (success line) OR by owner profile (direct leg)
    const membersByMemberParent = new Map<string, Member[]>()
    const directLegByOwner = new Map<string, Member[]>()

    for (const m of members) {
      const hasKnownMemberParent =
        m.recruited_by_member_id !== null &&
        memberById.has(m.recruited_by_member_id)
      if (hasKnownMemberParent) {
        const k = m.recruited_by_member_id as string
        const list = membersByMemberParent.get(k)
        if (list) list.push(m)
        else membersByMemberParent.set(k, [m])
      } else {
        // direct leg OR orphan success line — attach to the account owner
        const list = directLegByOwner.get(m.account_owner_id)
        if (list) list.push(m)
        else directLegByOwner.set(m.account_owner_id, [m])
      }
    }

    // Total members each profile owns (regardless of recruiter chain)
    const memberCountByOwner = new Map<string, number>()
    for (const m of members) {
      memberCountByOwner.set(
        m.account_owner_id,
        (memberCountByOwner.get(m.account_owner_id) ?? 0) + 1,
      )
    }

    // Member promotion map (id → name) for "Promoted from" badge on profiles
    const promotionMap = new Map<string, string>()
    for (const m of members) promotionMap.set(m.id, m.name)

    const visitedMembers = new Set<string>()
    const visitedProfiles = new Set<string>()

    const buildMemberNode = (m: Member): MemberNode => {
      if (visitedMembers.has(m.id)) {
        return { kind: 'member', member: m, children: [], descendantCount: 0 }
      }
      visitedMembers.add(m.id)
      const childMembers = membersByMemberParent.get(m.id) ?? []
      const children = childMembers.map(buildMemberNode)
      const descendantCount = children.reduce(
        (sum, c) => sum + c.descendantCount + 1,
        0,
      )
      return { kind: 'member', member: m, children, descendantCount }
    }

    const buildProfileNode = (p: Profile): ProfileNode => {
      if (visitedProfiles.has(p.id)) {
        return {
          kind: 'profile',
          profile: p,
          memberCount: 0,
          promotedFromName: null,
          descendantCount: 0,
          children: [],
        }
      }
      visitedProfiles.add(p.id)

      const sponsorChildren = (profilesByInviter.get(p.id) ?? []).map(
        buildProfileNode,
      )
      const memberChildren = (directLegByOwner.get(p.id) ?? []).map(
        buildMemberNode,
      )
      const children: OrgNode[] = [...sponsorChildren, ...memberChildren]
      const descendantCount = children.reduce(
        (sum, c) => sum + c.descendantCount + 1,
        0,
      )
      return {
        kind: 'profile',
        profile: p,
        memberCount: memberCountByOwner.get(p.id) ?? 0,
        promotedFromName: p.promoted_from_member_id
          ? promotionMap.get(p.promoted_from_member_id) ?? null
          : null,
        descendantCount,
        children,
      }
    }

    return (profilesByInviter.get(null) ?? []).map(buildProfileNode)
  }, [profiles, members])

  const sponsorCount = profiles.filter((p) => p.role === 'sponsor').length
  const adminCount = profiles.filter((p) => p.role === 'admin').length
  const totalMembers = members.length

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
          <Network className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Org tree
          </h1>
          <p className="text-slate-500 mt-1.5">
            The full hierarchy — admins, sponsors they invited, and every member
            beneath each sponsor.
          </p>
        </div>
        <Link
          to="/admin/sponsors"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-900"
        >
          See list
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatPill label="Admins" value={adminCount} />
        <StatPill label="Sponsors" value={sponsorCount} />
        <StatPill label="Members" value={totalMembers} />
      </div>

      {tree.length === 0 ? (
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="No accounts yet"
          description="Once admins and sponsors exist they'll appear here."
        />
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(2,6,23,0.04)]">
          <div className="org-tree">
            <div className="org-tree-row is-root">
              {tree.map((node) => (
                <NodeCell key={nodeKey(node)} node={node} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function nodeKey(n: OrgNode) {
  return n.kind === 'profile' ? `p:${n.profile.id}` : `m:${n.member.id}`
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 px-4 py-3 shadow-[0_1px_2px_rgba(2,6,23,0.04)]">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
        {value}
      </div>
    </div>
  )
}

function NodeCell({ node }: { node: OrgNode }) {
  return (
    <div className="org-tree-cell">
      {node.kind === 'profile' ? (
        <ProfileCard node={node} />
      ) : (
        <MemberCard node={node} />
      )}

      {node.children.length > 0 && (
        <div className="org-tree-row">
          {node.children.map((c) => (
            <NodeCell key={nodeKey(c)} node={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileCard({ node }: { node: ProfileNode }) {
  const p = node.profile
  const isAdmin = p.role === 'admin'
  return (
    <Link
      to={isAdmin ? '/admin' : `/admin/sponsors/${p.id}`}
      className={`group block rounded-xl border bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(2,6,23,0.04)] hover:shadow-[0_4px_12px_-4px_rgba(2,6,23,0.15)] hover:-translate-y-0.5 transition-all duration-150 min-w-[200px] ${
        p.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'
      } ${isAdmin ? 'ring-1 ring-amber-200 bg-amber-50/40' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={p.name} size="sm" />
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-semibold truncate ${
              p.is_active
                ? 'text-slate-900 group-hover:text-sky-700'
                : 'text-slate-400 line-through'
            }`}
          >
            {p.name}
          </div>
          <div className="text-[11px] text-slate-500 truncate">{p.email}</div>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1 flex-wrap">
        {isAdmin ? (
          <Badge tone="warning">
            <ShieldCheck className="w-3 h-3 mr-0.5" />
            Admin
          </Badge>
        ) : (
          <Badge tone="info">
            <UserCog className="w-3 h-3 mr-0.5" />
            Sponsor
          </Badge>
        )}
        {node.promotedFromName && (
          <Badge tone="accent">
            <Crown className="w-3 h-3 mr-0.5" />
            Promoted
          </Badge>
        )}
      </div>
      {!isAdmin && (node.memberCount > 0 || node.descendantCount > 0) && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
          <span>
            {node.memberCount} member{node.memberCount === 1 ? '' : 's'}
          </span>
          {node.descendantCount > 0 && (
            <span> · {node.descendantCount} downstream</span>
          )}
        </div>
      )}
    </Link>
  )
}

function MemberCard({ node }: { node: MemberNode }) {
  const m = node.member
  return (
    <div
      className={`block rounded-xl border bg-white px-3 py-2 shadow-[0_1px_2px_rgba(2,6,23,0.04)] min-w-[170px] ${
        m.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2">
        <Avatar name={m.name} size="sm" />
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-semibold truncate ${
              m.is_active ? 'text-slate-900' : 'text-slate-400 line-through'
            }`}
          >
            {m.name}
          </div>
          <div className="mt-0.5 flex items-center gap-1 flex-wrap">
            <Badge tone={STATUS_TONES[m.status]}>{STATUS_LABELS[m.status]}</Badge>
            {!m.is_active && <Badge tone="danger">Quit</Badge>}
          </div>
        </div>
      </div>
      {(m.is_trainer || node.descendantCount > 0) && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
          {m.is_trainer && <span className="font-medium">Trainer</span>}
          {node.descendantCount > 0 && (
            <span>
              {node.descendantCount} downline
              {node.descendantCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
