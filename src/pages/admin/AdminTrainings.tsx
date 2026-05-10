import { useEffect, useMemo, useState } from 'react'
import {
  Users,
  BookOpen,
  Award,
  Presentation,
  CalendarDays,
  Search,
  UserCheck,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type {
  Member,
  Profile,
  Training,
  TrainingAttendee,
  TrainingType,
} from '../../lib/types'
import {
  TRAINING_TYPE_LABELS,
  TRAINING_TYPE_TONES,
} from '../../lib/types'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Avatar from '../../components/ui/Avatar'
import { Input } from '../../components/ui/Input'

const typeIcons: Record<TrainingType, typeof Users> = {
  guest: Users,
  pro: BookOpen,
  distributor: Award,
}

export default function AdminTrainings() {
  const [trainings, setTrainings] = useState<Training[] | null>(null)
  const [sponsorMap, setSponsorMap] = useState<Map<string, Profile>>(new Map())
  const [attendees, setAttendees] = useState<TrainingAttendee[]>([])
  const [memberNameById, setMemberNameById] = useState<Map<string, string>>(new Map())
  const [filter, setFilter] = useState<'all' | TrainingType>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let mounted = true
    Promise.all([
      supabase
        .from('trainings')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'sponsor'),
      supabase.from('training_attendees').select('*'),
      supabase.from('members').select('id,name'),
    ]).then(([t, s, a, m]) => {
      if (!mounted) return
      setTrainings((t.data as Training[] | null) ?? [])
      const sMap = new Map<string, Profile>()
      ;((s.data as Profile[] | null) ?? []).forEach((p) => sMap.set(p.id, p))
      setSponsorMap(sMap)
      setAttendees((a.data as TrainingAttendee[] | null) ?? [])
      setMemberNameById(
        new Map(
          ((m.data as Pick<Member, 'id' | 'name'>[] | null) ?? []).map((x) => [
            x.id,
            x.name,
          ]),
        ),
      )
    })
    return () => {
      mounted = false
    }
  }, [])

  const attendeeNamesByTraining = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const a of attendees) {
      const name = memberNameById.get(a.member_id)
      if (!name) continue
      if (!map.has(a.training_id)) map.set(a.training_id, [])
      map.get(a.training_id)!.push(name)
    }
    for (const list of map.values()) list.sort()
    return map
  }, [attendees, memberNameById])

  const counts = useMemo(() => {
    const all = trainings?.length ?? 0
    const byType = { guest: 0, pro: 0, distributor: 0 } as Record<TrainingType, number>
    for (const t of trainings ?? []) byType[t.type]++
    return { all, ...byType }
  }, [trainings])

  const filtered = useMemo(() => {
    if (!trainings) return []
    return trainings.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false
      if (search) {
        const q = search.toLowerCase()
        const sponsorName = sponsorMap.get(t.account_owner_id)?.name ?? ''
        if (
          !t.title.toLowerCase().includes(q) &&
          !sponsorName.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [trainings, sponsorMap, filter, search])

  const loading = trainings === null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          All trainings
        </h1>
        <p className="text-slate-500 mt-1.5">
          Every training logged across all sponsors.{' '}
          <span className="text-slate-400">({counts.all} total)</span>
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl self-start w-fit">
          {(['all', 'guest', 'pro', 'distributor'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                filter === f
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f === 'all' ? 'All' : TRAINING_TYPE_LABELS[f].replace(' training', '')}
              <span className="ml-1.5 text-xs text-slate-500 tabular-nums">
                {f === 'all' ? counts.all : counts[f]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trainings or sponsors…"
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Presentation className="w-5 h-5" />}
          title={search ? 'No matches' : 'No trainings logged yet'}
          description={
            search
              ? `No trainings match "${search}".`
              : 'When sponsors log trainings, they show up here.'
          }
        />
      ) : (
        <Card padded={false}>
          {filtered.map((t, i) => {
            const Icon = typeIcons[t.type]
            const sponsor = sponsorMap.get(t.account_owner_id)
            const names = attendeeNamesByTraining.get(t.id) ?? []
            const shown = names.slice(0, 3)
            const more = names.length - shown.length
            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 p-4 ${
                  i > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <div
                  className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                    t.type === 'guest'
                      ? 'bg-emerald-100 text-emerald-700'
                      : t.type === 'pro'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 truncate">
                      {t.title}
                    </span>
                    <Badge tone={TRAINING_TYPE_TONES[t.type]}>
                      {TRAINING_TYPE_LABELS[t.type]}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {new Date(t.date + 'T00:00:00').toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {t.attendee_count > 0 && (
                      <>
                        <span>·</span>
                        <span>{t.attendee_count} attendees</span>
                      </>
                    )}
                  </div>
                  {names.length > 0 && (
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                      <UserCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span className="truncate">
                        {shown.join(', ')}
                        {more > 0 && (
                          <span className="text-slate-400"> +{more} more</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
                  <Avatar name={sponsor?.name ?? '?'} size="sm" />
                  <span className="font-medium text-slate-700">
                    {sponsor?.name ?? '—'}
                  </span>
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
