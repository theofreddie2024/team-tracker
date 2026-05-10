import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Users,
  BookOpen,
  Award,
  Presentation,
  ChevronRight,
  CalendarDays,
  UserCheck,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthProvider'
import type { Member, Training, TrainingAttendee, TrainingType } from '../../lib/types'
import {
  TRAINING_TYPE_LABELS,
  TRAINING_TYPE_TONES,
} from '../../lib/types'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'

const typeIcons: Record<TrainingType, typeof Users> = {
  guest: Users,
  pro: BookOpen,
  distributor: Award,
}

export default function SponsorTrainings() {
  const { profile } = useAuth()
  const [trainings, setTrainings] = useState<Training[] | null>(null)
  const [attendees, setAttendees] = useState<TrainingAttendee[]>([])
  const [memberNameById, setMemberNameById] = useState<Map<string, string>>(new Map())
  const [filter, setFilter] = useState<'all' | TrainingType>('all')

  useEffect(() => {
    if (!profile?.id) return
    let mounted = true
    Promise.all([
      supabase
        .from('trainings')
        .select('*')
        .eq('account_owner_id', profile.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('members')
        .select('id,name')
        .eq('account_owner_id', profile.id),
    ]).then(async ([tRes, mRes]) => {
      if (!mounted) return
      const ts = (tRes.data as Training[] | null) ?? []
      const ms = (mRes.data as Pick<Member, 'id' | 'name'>[] | null) ?? []
      setTrainings(ts)
      setMemberNameById(new Map(ms.map((m) => [m.id, m.name])))

      if (ts.length === 0) {
        setAttendees([])
        return
      }
      const { data: aData } = await supabase
        .from('training_attendees')
        .select('*')
        .in('training_id', ts.map((t) => t.id))
      if (mounted) setAttendees((aData as TrainingAttendee[] | null) ?? [])
    })
    return () => {
      mounted = false
    }
  }, [profile?.id])

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

  const filtered =
    trainings && filter === 'all'
      ? trainings
      : (trainings ?? []).filter((t) => t.type === filter)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Trainings
          </h1>
          <p className="text-slate-500 mt-1.5">
            Log every guest, pro, and distributor training as it happens.
          </p>
        </div>
        <Link to="/trainings/new">
          <Button variant="accent" leftIcon={<Plus className="w-4 h-4" />}>
            Log training
          </Button>
        </Link>
      </div>

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

      {trainings === null ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-1/3" />
                <div className="h-2.5 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Presentation className="w-5 h-5" />}
          title={
            filter === 'all'
              ? 'No trainings logged yet'
              : `No ${TRAINING_TYPE_LABELS[filter as TrainingType].toLowerCase()}s logged`
          }
          description={
            filter === 'all'
              ? 'Log a training session to start tracking attendance.'
              : undefined
          }
          action={
            filter === 'all' ? (
              <Link to="/trainings/new">
                <Button variant="accent" leftIcon={<Plus className="w-4 h-4" />}>
                  Log your first training
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_1px_2px_rgba(2,6,23,0.04)]">
          {filtered.map((t, i) => {
            const Icon = typeIcons[t.type]
            const names = attendeeNamesByTraining.get(t.id) ?? []
            const shown = names.slice(0, 3)
            const more = names.length - shown.length
            return (
              <Link
                key={t.id}
                to={`/trainings/${t.id}`}
                className={`flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group ${
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
                  <div className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {new Date(t.date + 'T00:00:00').toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {t.attendee_count > 0 && (
                      <>
                        <span>·</span>
                        <span>
                          {t.attendee_count} attendee
                          {t.attendee_count === 1 ? '' : 's'}
                        </span>
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
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
