import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Crown, Send, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthProvider'
import type { IncomeBracket, Invitation, Member, MemberStatus } from '../../lib/types'
import {
  INCOME_BRACKET_LABELS,
  STATUS_GROUPS,
  STATUS_LABELS,
  isDistributor,
} from '../../lib/types'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { Checkbox, Field, Input, Select } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

interface FormState {
  name: string
  status: MemberStatus
  income_bracket: IncomeBracket
  is_consistent: boolean
  attends_office_consistently: boolean
  is_trainer: boolean
  joined_at: string
  first_earnings_at: string
  recruiter_kind: 'sponsor' | 'member'
  recruited_by_member_id: string
  is_active: boolean
  quit_at: string
  quit_reason: string
}

const emptyForm: FormState = {
  name: '',
  status: 'newbie',
  income_bracket: 'none',
  is_consistent: false,
  attends_office_consistently: false,
  is_trainer: false,
  joined_at: new Date().toISOString().slice(0, 10),
  first_earnings_at: '',
  recruiter_kind: 'sponsor',
  recruited_by_member_id: '',
  is_active: true,
  quit_at: '',
  quit_reason: '',
}

export default function MemberForm() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [teamMembers, setTeamMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Promote-to-sponsor state
  const [promotedProfileName, setPromotedProfileName] = useState<string | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<Invitation | null>(null)
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [promoteEmail, setPromoteEmail] = useState('')
  const [promoting, setPromoting] = useState(false)
  const [promoteError, setPromoteError] = useState<string | null>(null)
  const [promoteLink, setPromoteLink] = useState<string | null>(null)
  const [promoteCopied, setPromoteCopied] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    let mounted = true
    Promise.all([
      supabase
        .from('members')
        .select('*')
        .eq('account_owner_id', profile.id)
        .eq('is_active', true),
      isEdit
        ? supabase.from('members').select('*').eq('id', id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      isEdit
        ? supabase
            .from('profiles')
            .select('id,name')
            .eq('promoted_from_member_id', id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      isEdit
        ? supabase
            .from('invitations')
            .select('*')
            .eq('promotes_member_id', id)
            .is('accepted_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]).then(([allMembers, current, promoted, pending]) => {
      if (!mounted) return
      setTeamMembers((allMembers.data as Member[] | null) ?? [])
      if (isEdit && current.data) {
        const m = current.data as Member
        setForm({
          name: m.name,
          status: m.status,
          income_bracket: m.income_bracket,
          is_consistent: m.is_consistent,
          attends_office_consistently: m.attends_office_consistently,
          is_trainer: m.is_trainer,
          joined_at: m.joined_at,
          first_earnings_at: m.first_earnings_at ?? '',
          recruiter_kind: m.recruited_by_user_id ? 'sponsor' : 'member',
          recruited_by_member_id: m.recruited_by_member_id ?? '',
          is_active: m.is_active,
          quit_at: m.quit_at ?? '',
          quit_reason: m.quit_reason ?? '',
        })
      }
      const promotedRow = promoted.data as { id: string; name: string } | null
      setPromotedProfileName(promotedRow?.name ?? null)
      setPendingPromotion((pending.data as Invitation | null) ?? null)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [profile?.id, id, isEdit])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setError(null)

    if (form.recruiter_kind === 'member' && !form.recruited_by_member_id) {
      setError('Please choose who recruited this member.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        account_owner_id: profile.id,
        recruited_by_user_id: form.recruiter_kind === 'sponsor' ? profile.id : null,
        recruited_by_member_id:
          form.recruiter_kind === 'member' ? form.recruited_by_member_id : null,
        name: form.name.trim(),
        status: form.status,
        income_bracket: form.income_bracket,
        is_consistent: form.is_consistent,
        attends_office_consistently: form.attends_office_consistently,
        is_trainer: form.is_trainer,
        joined_at: form.joined_at,
        first_earnings_at: form.first_earnings_at || null,
        is_active: form.is_active,
        quit_at: !form.is_active && form.quit_at ? form.quit_at : null,
        quit_reason: !form.is_active ? form.quit_reason || null : null,
      }

      if (isEdit) {
        const { error } = await supabase.from('members').update(payload).eq('id', id!)
        if (error) {
          setError(error.message)
          return
        }
      } else {
        const { error } = await supabase.from('members').insert(payload)
        if (error) {
          setError(error.message)
          return
        }
      }
      navigate('/members')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isEdit) return
    if (
      !confirm(
        'Delete this member permanently? Use "Mark as quit" instead if they left the business.',
      )
    )
      return
    const { error } = await supabase.from('members').delete().eq('id', id!)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/members')
  }

  const handlePromote = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile || !id) return
    setPromoteError(null)
    setPromoting(true)
    try {
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email: promoteEmail.trim().toLowerCase(),
          invited_by_user_id: profile.id,
          promotes_member_id: id,
        })
        .select()
        .single()
      if (error) {
        setPromoteError(error.message)
        return
      }
      const inv = data as Invitation
      setPendingPromotion(inv)
      setPromoteLink(`${window.location.origin}/accept-invite/${inv.token}`)
      setPromoteEmail('')
      setPromoteOpen(false)
    } finally {
      setPromoting(false)
    }
  }

  const revokePromotion = async () => {
    if (!pendingPromotion) return
    if (!confirm('Revoke this promotion invitation?')) return
    await supabase.from('invitations').delete().eq('id', pendingPromotion.id)
    setPendingPromotion(null)
    setPromoteLink(null)
  }

  const copyPromoteLink = async () => {
    if (!promoteLink) return
    await navigator.clipboard.writeText(promoteLink)
    setPromoteCopied(true)
    setTimeout(() => setPromoteCopied(false), 2000)
  }

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>

  const otherMembers = teamMembers.filter((m) => m.id !== id)
  const canPromote =
    isEdit &&
    form.is_active &&
    isDistributor(form.status) &&
    !promotedProfileName

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        to="/members"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to team
      </Link>

      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
        {isEdit ? 'Edit member' : 'Add member'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <SectionTitle>Basics</SectionTitle>
          <div className="space-y-4">
            <Field label="Name" required>
              <Input
                type="text"
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Mary Johnson"
              />
            </Field>
            <Field label="How did they join?" required>
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.recruiter_kind === 'sponsor'}
                    onChange={() => update('recruiter_kind', 'sponsor')}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">I recruited them</span>{' '}
                    <span className="text-slate-500">(Direct Leg)</span>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.recruiter_kind === 'member'}
                    onChange={() => update('recruiter_kind', 'member')}
                    disabled={otherMembers.length === 0}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">Another team member recruited them</span>{' '}
                    <span className="text-slate-500">(Success Line)</span>
                    {otherMembers.length === 0 && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        No other members yet — add Direct Leg members first
                      </div>
                    )}
                  </span>
                </label>
                {form.recruiter_kind === 'member' && (
                  <Select
                    required
                    value={form.recruited_by_member_id}
                    onChange={(e) =>
                      update('recruited_by_member_id', e.target.value)
                    }
                    className="ml-6 mt-2 max-w-xs"
                  >
                    <option value="">— Select recruiter —</option>
                    {otherMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle>Status & earnings</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => update('status', e.target.value as MemberStatus)}
              >
                {STATUS_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.statuses.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="Income bracket">
              <Select
                value={form.income_bracket}
                onChange={(e) =>
                  update('income_bracket', e.target.value as IncomeBracket)
                }
              >
                {(Object.keys(INCOME_BRACKET_LABELS) as IncomeBracket[]).map((b) => (
                  <option key={b} value={b}>
                    {INCOME_BRACKET_LABELS[b]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Joined on">
              <Input
                type="date"
                value={form.joined_at}
                onChange={(e) => update('joined_at', e.target.value)}
              />
            </Field>
            <Field label="First earnings" hint="Optional, for newbies">
              <Input
                type="date"
                value={form.first_earnings_at}
                onChange={(e) => update('first_earnings_at', e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
            <Checkbox
              label="Consistent distributor"
              checked={form.is_consistent}
              onChange={(e) => update('is_consistent', e.target.checked)}
            />
            <Checkbox
              label="Attends office consistently"
              checked={form.attends_office_consistently}
              onChange={(e) =>
                update('attends_office_consistently', e.target.checked)
              }
            />
            <Checkbox
              label="Is a Trainer (capable of leading a training session)"
              checked={form.is_trainer}
              onChange={(e) => update('is_trainer', e.target.checked)}
            />
          </div>
        </Card>

        <Card>
          <SectionTitle>Membership status</SectionTitle>
          <Checkbox
            label="This member has quit the business"
            checked={!form.is_active}
            onChange={(e) => update('is_active', !e.target.checked)}
          />
          {!form.is_active && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Quit on">
                <Input
                  type="date"
                  value={form.quit_at}
                  onChange={(e) => update('quit_at', e.target.value)}
                />
              </Field>
              <Field label="Reason for quitting">
                <Input
                  type="text"
                  value={form.quit_reason}
                  onChange={(e) => update('quit_reason', e.target.value)}
                  placeholder="Why did they leave?"
                />
              </Field>
            </div>
          )}
        </Card>

        {isEdit && (promotedProfileName || canPromote || pendingPromotion) && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-amber-600" />
              <SectionTitle>Promotion</SectionTitle>
            </div>

            {promotedProfileName ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                <div className="font-semibold">Already promoted</div>
                <div className="mt-0.5">
                  This member has a sponsor account:{' '}
                  <span className="font-medium">{promotedProfileName}</span>.
                </div>
              </div>
            ) : pendingPromotion ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <div className="text-sm font-semibold text-amber-900">
                  Promotion invite pending
                </div>
                <div className="text-xs text-amber-800 mt-0.5">
                  Sent to <span className="font-medium">{pendingPromotion.email}</span>.
                  Expires {new Date(pendingPromotion.expires_at).toLocaleDateString()}.
                </div>
                {promoteLink && (
                  <div className="mt-3 flex items-start gap-2">
                    <div className="text-xs text-amber-900 font-mono break-all flex-1 bg-white/60 rounded-lg px-2 py-1.5 border border-amber-200">
                      {promoteLink}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={
                        promoteCopied ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )
                      }
                      onClick={copyPromoteLink}
                    >
                      {promoteCopied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                )}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={revokePromotion}
                    className="text-xs font-medium text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    Revoke invite
                  </button>
                </div>
              </div>
            ) : canPromote ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  This member has reached distributor rank. You can invite them to
                  open their own sponsor account.
                </p>
                <Button
                  type="button"
                  variant="accent"
                  leftIcon={<Crown className="w-4 h-4" />}
                  onClick={() => {
                    setPromoteOpen(true)
                    setPromoteError(null)
                    setPromoteLink(null)
                  }}
                >
                  Promote to sponsor
                </Button>
              </div>
            ) : null}
          </Card>
        )}

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button type="submit" variant="accent" size="lg" loading={saving}>
            {isEdit ? 'Save changes' : 'Add member'}
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
        open={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        title={`Promote ${form.name || 'member'} to sponsor`}
        maxWidth="sm"
      >
        <form onSubmit={handlePromote} className="space-y-4">
          <p className="text-sm text-slate-600">
            We'll send a sign-up link to this email. Once they create their
            account they'll have their own sponsor dashboard, linked back to
            this member record.
          </p>
          <Field label="Email address" required>
            <Input
              autoFocus
              type="email"
              required
              value={promoteEmail}
              onChange={(e) => setPromoteEmail(e.target.value)}
              placeholder="member@example.com"
            />
          </Field>
          {promoteError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-700">
              {promoteError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPromoteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              loading={promoting}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Send invitation
            </Button>
          </div>
        </form>
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
