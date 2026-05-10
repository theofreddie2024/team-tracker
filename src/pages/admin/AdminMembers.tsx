import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Search, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Member, Profile } from '../../lib/types'
import { STATUS_LABELS, STATUS_TONES } from '../../lib/types'
import Card from '../../components/ui/Card'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'

export default function AdminMembers() {
  const [members, setMembers] = useState<Member[]>([])
  const [sponsorMap, setSponsorMap] = useState<Map<string, Profile>>(new Map())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let mounted = true
    Promise.all([
      supabase.from('members').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'sponsor'),
    ]).then(([m, s]) => {
      if (!mounted) return
      setMembers((m.data as Member[] | null) ?? [])
      const map = new Map<string, Profile>()
      ;((s.data as Profile[] | null) ?? []).forEach((p) => map.set(p.id, p))
      setSponsorMap(map)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (!search) return members
    const q = search.toLowerCase()
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        sponsorMap.get(m.account_owner_id)?.name.toLowerCase().includes(q),
    )
  }, [members, search, sponsorMap])

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          All members
        </h1>
        <p className="text-slate-500 mt-1.5">
          Every member across every sponsor's team.{' '}
          <span className="text-slate-400">({members.length} total)</span>
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by member or sponsor name…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title={search ? 'No matches' : 'No members yet'}
          description={
            search
              ? `No members match "${search}".`
              : 'Members added by sponsors will show up here.'
          }
        />
      ) : (
        <Card padded={false}>
          {filtered.map((m, i) => {
            const sponsor = sponsorMap.get(m.account_owner_id)
            return (
              <Link
                key={m.id}
                to={`/admin/members/${m.id}`}
                className={`flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group ${
                  i > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <Avatar name={m.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 truncate group-hover:text-sky-700">
                      {m.name}
                    </span>
                    <Badge tone={STATUS_TONES[m.status]}>{STATUS_LABELS[m.status]}</Badge>
                    {m.is_trainer && <Badge tone="info">Trainer</Badge>}
                    {!m.is_active && <Badge tone="danger">Quit</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {m.recruited_by_user_id ? 'Direct Leg' : 'Success Line'} · Sponsor:{' '}
                    <span className="font-medium text-slate-700">
                      {sponsor?.name ?? '—'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
              </Link>
            )
          })}
        </Card>
      )}
    </div>
  )
}
