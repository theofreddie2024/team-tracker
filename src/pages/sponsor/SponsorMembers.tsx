import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, UserPlus, Search, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthProvider'
import type { Member } from '../../lib/types'
import {
  STATUS_LABELS,
  STATUS_TONES,
  INCOME_BRACKET_LABELS,
} from '../../lib/types'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import EmptyState from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'

export default function SponsorMembers() {
  const { profile } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'quit'>('active')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!profile?.id) return
    let mounted = true
    supabase
      .from('members')
      .select('*')
      .eq('account_owner_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!mounted) return
        setMembers((data as Member[] | null) ?? [])
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [profile?.id])

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.id, m] as const)),
    [members],
  )

  const counts = {
    active: members.filter((m) => m.is_active).length,
    quit: members.filter((m) => !m.is_active).length,
    all: members.length,
  }

  const filtered = members.filter((m) => {
    if (filter === 'active' && !m.is_active) return false
    if (filter === 'quit' && m.is_active) return false
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()))
      return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My team</h1>
          <p className="text-slate-500 mt-1.5">
            Manage your downline and track who's where.
          </p>
        </div>
        <Link to="/members/new">
          <Button variant="accent" leftIcon={<UserPlus className="w-4 h-4" />}>
            Add member
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl self-start">
          {(['active', 'quit', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                filter === f
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f === 'active' ? 'Active' : f === 'quit' ? 'Quitters' : 'All'}
              <span className="ml-1.5 text-xs text-slate-500 tabular-nums">
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-1/3" />
                <div className="h-2.5 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title={
            search
              ? 'No matches'
              : filter === 'active'
                ? 'No active members yet'
                : filter === 'quit'
                  ? 'No quitters'
                  : 'No members yet'
          }
          description={
            search
              ? `No members match "${search}".`
              : filter === 'active'
                ? 'Add your first member to start tracking your team.'
                : undefined
          }
          action={
            filter === 'active' && !search ? (
              <Link to="/members/new">
                <Button variant="accent" leftIcon={<UserPlus className="w-4 h-4" />}>
                  Add your first member
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_1px_2px_rgba(2,6,23,0.04)]">
          {filtered.map((m, i) => {
            const recruiterMember = m.recruited_by_member_id
              ? memberById.get(m.recruited_by_member_id)
              : null
            return (
              <Link
                key={m.id}
                to={`/members/${m.id}`}
                className={`flex items-center gap-3 p-4 transition-colors hover:bg-slate-50 group ${
                  i > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <Avatar name={m.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 truncate">
                      {m.name}
                    </span>
                    <Badge tone={STATUS_TONES[m.status]}>
                      {STATUS_LABELS[m.status]}
                    </Badge>
                    {m.is_trainer && <Badge tone="info">Trainer</Badge>}
                    {!m.is_active && <Badge tone="danger">Quit</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {m.recruited_by_user_id
                      ? 'Direct Leg'
                      : `Success Line${recruiterMember ? ` · via ${recruiterMember.name}` : ''}`}
                    {' · '}
                    {INCOME_BRACKET_LABELS[m.income_bracket]}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
