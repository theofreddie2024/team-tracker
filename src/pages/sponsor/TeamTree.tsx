import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Network, Users } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { supabase } from '../../lib/supabase'
import type { Member } from '../../lib/types'
import { STATUS_LABELS, STATUS_TONES } from '../../lib/types'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'

interface TreeNode {
  member: Member
  children: TreeNode[]
  descendantCount: number
}

export default function TeamTree() {
  const { profile } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    let mounted = true
    supabase
      .from('members')
      .select('*')
      .eq('account_owner_id', profile.id)
      .order('name')
      .then(({ data }) => {
        if (!mounted) return
        setMembers((data as Member[] | null) ?? [])
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [profile?.id])

  const tree = useMemo<TreeNode[]>(() => {
    if (!profile?.id || members.length === 0) return []

    // Index by id and by parent member id.
    // Roots = direct-leg members (recruited_by_user_id matches sponsor)
    //         OR success-line members whose parent isn't in the loaded set (orphans).
    const ROOT = '__root__'
    const idSet = new Set(members.map((m) => m.id))
    const childrenByParent = new Map<string, Member[]>()

    for (const m of members) {
      const isSuccessLineWithKnownParent =
        m.recruited_by_member_id !== null && idSet.has(m.recruited_by_member_id)
      const parentKey = isSuccessLineWithKnownParent
        ? (m.recruited_by_member_id as string)
        : ROOT
      const list = childrenByParent.get(parentKey)
      if (list) list.push(m)
      else childrenByParent.set(parentKey, [m])
    }

    const visited = new Set<string>()
    const buildNode = (m: Member): TreeNode => {
      if (visited.has(m.id)) {
        return { member: m, children: [], descendantCount: 0 }
      }
      visited.add(m.id)
      const childMembers = childrenByParent.get(m.id) ?? []
      const children = childMembers.map(buildNode)
      const descendantCount = children.reduce(
        (sum, c) => sum + c.descendantCount + 1,
        0,
      )
      return { member: m, children, descendantCount }
    }

    const rootMembers = childrenByParent.get(ROOT) ?? []
    return rootMembers.map(buildNode)
  }, [members, profile?.id])

  const totalActive = members.filter((m) => m.is_active).length

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
          <Network className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Team tree
          </h1>
          <p className="text-slate-500 mt-1.5">
            Your downline, organized by who recruited whom.
          </p>
        </div>
        <Link
          to="/members"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-900"
        >
          See list
        </Link>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="No members yet"
          description="Add your first member to start building your team tree."
        />
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(2,6,23,0.04)]">
          <div className="org-tree">
            <div className="org-tree-row is-root">
              <div className="org-tree-cell">
                {/* Sponsor (root) */}
                <SponsorCard
                  name={profile!.name}
                  members={members.length}
                  active={totalActive}
                />
                {tree.length > 0 && (
                  <div className="org-tree-row">
                    {tree.map((node) => (
                      <MemberCell key={node.member.id} node={node} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SponsorCard({
  name,
  members,
  active,
}: {
  name: string
  members: number
  active: number
}) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-sky-700 via-sky-800 to-slate-900 text-white px-4 py-3 shadow-[0_4px_12px_-4px_rgba(2,6,23,0.25)] min-w-[180px]">
      <div className="flex items-center gap-2.5">
        <Avatar name={name} size="sm" />
        <div className="leading-tight">
          <div className="font-semibold text-sm">{name}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/70">
            Sponsor
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs text-white/80">
        <span className="font-bold tabular-nums text-white">{members}</span>{' '}
        member{members === 1 ? '' : 's'} ·{' '}
        <span className="font-bold tabular-nums text-white">{active}</span> active
      </div>
    </div>
  )
}

function MemberCell({ node }: { node: TreeNode }) {
  const m = node.member
  return (
    <div className="org-tree-cell">
      <Link
        to={`/members/${m.id}`}
        className={`group block rounded-xl border bg-white px-3 py-2 shadow-[0_1px_2px_rgba(2,6,23,0.04)] hover:shadow-[0_4px_12px_-4px_rgba(2,6,23,0.15)] hover:-translate-y-0.5 transition-all duration-150 min-w-[170px] ${
          m.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'
        }`}
      >
        <div className="flex items-center gap-2">
          <Avatar name={m.name} size="sm" />
          <div className="flex-1 min-w-0">
            <div
              className={`text-sm font-semibold truncate ${
                m.is_active
                  ? 'text-slate-900 group-hover:text-sky-700'
                  : 'text-slate-400 line-through'
              }`}
            >
              {m.name}
            </div>
            <div className="mt-0.5 flex items-center gap-1 flex-wrap">
              <Badge tone={STATUS_TONES[m.status]}>
                {STATUS_LABELS[m.status]}
              </Badge>
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
      </Link>

      {node.children.length > 0 && (
        <div className="org-tree-row">
          {node.children.map((c) => (
            <MemberCell key={c.member.id} node={c} />
          ))}
        </div>
      )}
    </div>
  )
}
