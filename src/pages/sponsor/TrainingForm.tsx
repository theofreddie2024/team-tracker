import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Search, Trash2, UserPlus, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthProvider'
import type { Member, Training, TrainingAttendee, TrainingType } from '../../lib/types'
import { STATUS_LABELS, STATUS_TONES, TRAINING_TYPE_LABELS } from '../../lib/types'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { Field, Input, Textarea } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

interface FormState {
  type: TrainingType
  title: string
  date: string
  attendee_count: string
  notes: string
}

const today = () => new Date().toISOString().slice(0, 10)

const emptyForm: FormState = {
  type: 'guest',
  title: '',
  date: today(),
  attendee_count: '',
  notes: '',
}

export default function TrainingForm() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [teamMembers, setTeamMembers] = useState<Member[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')

  const filteredModalMembers = useMemo(() => {
    if (!memberSearch.trim()) return teamMembers
    const q = memberSearch.toLowerCase()
    return teamMembers.filter((m) => m.name.toLowerCase().includes(q))
  }, [teamMembers, memberSearch])

  useEffect(() => {
    if (!profile?.id) return
    let mounted = true

    const membersQuery = supabase
      .from('members')
      .select('*')
      .eq('account_owner_id', profile.id)
      .eq('is_active', true)
      .order('name')

    const trainingQuery = isEdit
      ? supabase.from('trainings').select('*').eq('id', id!).maybeSingle()
      : Promise.resolve({ data: null, error: null })

    const attendeesQuery = isEdit
      ? supabase.from('training_attendees').select('*').eq('training_id', id!)
      : Promise.resolve({ data: [], error: null })

    Promise.all([membersQuery, trainingQuery, attendeesQuery]).then(([m, t, a]) => {
      if (!mounted) return
      setTeamMembers((m.data as Member[] | null) ?? [])
      if (isEdit && t.data) {
        const tr = t.data as Training
        setForm({
          type: tr.type,
          title: tr.title,
          date: tr.date,
          attendee_count: String(tr.attendee_count),
          notes: tr.notes ?? '',
        })
      }
      const attendeeIds = new Set(
        ((a.data as TrainingAttendee[] | null) ?? []).map((x) => x.member_id),
      )
      setSelectedMemberIds(attendeeIds)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [id, isEdit, profile?.id])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setError(null)
    setSaving(true)
    try {
      const attendeeCount = form.attendee_count
        ? Math.max(0, parseInt(form.attendee_count, 10) || 0)
        : 0
      const payload = {
        account_owner_id: profile.id,
        type: form.type,
        title: form.title.trim(),
        date: form.date,
        attendee_count: attendeeCount,
        notes: form.notes.trim() || null,
      }

      let trainingId: string
      if (isEdit) {
        const { error } = await supabase.from('trainings').update(payload).eq('id', id!)
        if (error) { setError(error.message); return }
        trainingId = id!
      } else {
        const { data, error } = await supabase
          .from('trainings')
          .insert(payload)
          .select()
          .single()
        if (error) { setError(error.message); return }
        trainingId = (data as Training).id
      }

      // Sync team member attendees: replace all
      await supabase.from('training_attendees').delete().eq('training_id', trainingId)
      if (selectedMemberIds.size > 0) {
        await supabase.from('training_attendees').insert(
          Array.from(selectedMemberIds).map((memberId) => ({
            training_id: trainingId,
            member_id: memberId,
          })),
        )
      }

      navigate('/trainings')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isEdit) return
    if (!confirm('Delete this training? This cannot be undone.')) return
    const { error } = await supabase.from('trainings').delete().eq('id', id!)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/trainings')
  }

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        to="/trainings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to trainings
      </Link>

      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
        {isEdit ? 'Edit training' : 'Log training'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <SectionTitle>Type</SectionTitle>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
            {(['guest', 'pro', 'distributor'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update('type', t)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  form.type === t
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {TRAINING_TYPE_LABELS[t].replace(' training', '')}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Details</SectionTitle>
          <div className="space-y-4">
            <Field label="Title" required>
              <Input
                type="text"
                required
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="e.g. Personal Development 101"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date" required>
                <Input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => update('date', e.target.value)}
                />
              </Field>
              <Field
                label="Attendees"
                hint={
                  form.type === 'guest'
                    ? 'How many guests showed up?'
                    : 'Optional'
                }
              >
                <Input
                  type="number"
                  min={0}
                  value={form.attendee_count}
                  onChange={(e) => update('attendee_count', e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
            <Field label="Notes" hint="Optional — topic, key takeaways, etc.">
              <Textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Anything worth remembering about this session…"
              />
            </Field>
          </div>
        </Card>

        {teamMembers.length > 0 && (
          <Card>
            <SectionTitle>Team members attending</SectionTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMemberModalOpen(true)}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                {selectedMemberIds.size > 0 ? 'Edit selection' : 'Select members'}
              </Button>
              <span className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900 tabular-nums">
                  {selectedMemberIds.size}
                </span>{' '}
                of {teamMembers.length} tagged
              </span>
            </div>

            {selectedMemberIds.size > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {teamMembers
                  .filter((m) => selectedMemberIds.has(m.id))
                  .map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700"
                    >
                      {m.name}
                    </span>
                  ))}
              </div>
            )}
          </Card>
        )}

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button type="submit" variant="accent" size="lg" loading={saving}>
            {isEdit ? 'Save changes' : 'Log training'}
          </Button>
          {isEdit && (
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={handleDelete}
              leftIcon={<Trash2 className="w-4 h-4" />}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              Delete
            </Button>
          )}
        </div>
      </form>

      <Modal
        open={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        title="Select team members"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900 tabular-nums">
                {selectedMemberIds.size}
              </span>{' '}
              selected
            </span>
            <Button
              type="button"
              variant="accent"
              onClick={() => setMemberModalOpen(false)}
            >
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              autoFocus
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search by name…"
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() =>
                setSelectedMemberIds(new Set(filteredModalMembers.map((m) => m.id)))
              }
              className="font-medium text-sky-700 hover:text-sky-900 cursor-pointer"
            >
              Select all{memberSearch ? ' shown' : ''}
            </button>
            <button
              type="button"
              onClick={() => setSelectedMemberIds(new Set())}
              className="font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Clear
            </button>
          </div>

          {filteredModalMembers.length === 0 ? (
            <div className="text-sm text-slate-500 py-6 text-center">
              <Users className="w-5 h-5 mx-auto mb-2 text-slate-300" />
              {memberSearch
                ? `No members match "${memberSearch}".`
                : 'No active members on your team.'}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {filteredModalMembers.map((m) => {
                const checked = selectedMemberIds.has(m.id)
                return (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedMemberIds((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(m.id)
                          else next.delete(m.id)
                          return next
                        })
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <Avatar name={m.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {m.name}
                      </div>
                    </div>
                    <Badge tone={STATUS_TONES[m.status]}>{STATUS_LABELS[m.status]}</Badge>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
      {children}
    </h2>
  )
}
