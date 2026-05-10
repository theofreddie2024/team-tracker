import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail,
  Copy,
  Trash2,
  ChevronRight,
  Send,
  Check,
  UserCog,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Invitation, Profile } from '../../lib/types'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Avatar from '../../components/ui/Avatar'
import { Field, Input } from '../../components/ui/Input'

export default function AdminSponsors() {
  const [sponsors, setSponsors] = useState<Profile[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [latestInviteLink, setLatestInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = async () => {
    setLoading(true)
    const [s, inv] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'sponsor')
        .order('created_at', { ascending: false }),
      supabase
        .from('invitations')
        .select('*')
        .is('accepted_at', null)
        .order('created_at', { ascending: false }),
    ])
    setSponsors((s.data as Profile[] | null) ?? [])
    setInvitations((inv.data as Invitation[] | null) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    setLatestInviteLink(null)
    setCopied(false)
    setInviting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setInviteError('Not signed in.')
        return
      }
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email: inviteEmail.trim().toLowerCase(),
          invited_by_user_id: user.id,
        })
        .select()
        .single()
      if (error) {
        setInviteError(error.message)
        return
      }
      const inv = data as Invitation
      setLatestInviteLink(`${window.location.origin}/accept-invite/${inv.token}`)
      setInviteEmail('')
      await load()
    } finally {
      setInviting(false)
    }
  }

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const revokeInvite = async (id: string) => {
    if (!confirm('Revoke this invitation?')) return
    await supabase.from('invitations').delete().eq('id', id)
    await load()
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Sponsors</h1>
        <p className="text-slate-500 mt-1.5">
          Invite people you trust to manage their own teams.
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
          Invite a sponsor
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
          <Field className="flex-1">
            <Input
              type="email"
              required
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </Field>
          <Button
            type="submit"
            variant="accent"
            loading={inviting}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Send invite
          </Button>
        </form>
        {inviteError && (
          <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-700">
            {inviteError}
          </div>
        )}
        {latestInviteLink && (
          <div className="mt-4 rounded-xl bg-sky-50 border border-sky-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 mb-1">
                  Share this link with your sponsor
                </div>
                <div className="text-xs text-sky-800 font-mono break-all">
                  {latestInviteLink}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={
                  copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />
                }
                onClick={() => copyLink(latestInviteLink)}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">
            Pending invitations{' '}
            <span className="text-slate-400 font-normal">({invitations.length})</span>
          </h2>
        </div>
        {loading ? (
          <Card>
            <div className="text-sm text-slate-500">Loading…</div>
          </Card>
        ) : invitations.length === 0 ? (
          <EmptyState
            icon={<Mail className="w-5 h-5" />}
            title="No pending invitations"
            description="Invite someone above to get them started."
          />
        ) : (
          <Card padded={false}>
            {invitations.map((inv, i) => (
              <div
                key={inv.id}
                className={`flex items-center gap-3 p-4 ${
                  i > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">
                    {inv.email}
                  </div>
                  <div className="text-xs text-slate-500">
                    Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      copyLink(
                        `${window.location.origin}/accept-invite/${inv.token}`,
                      )
                    }
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                    aria-label="Copy invite link"
                    title="Copy invite link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => revokeInvite(inv.id)}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    aria-label="Revoke invite"
                    title="Revoke invite"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          Active sponsors{' '}
          <span className="text-slate-400 font-normal">({sponsors.length})</span>
        </h2>
        {loading ? (
          <Card>
            <div className="text-sm text-slate-500">Loading…</div>
          </Card>
        ) : sponsors.length === 0 ? (
          <EmptyState
            icon={<UserCog className="w-5 h-5" />}
            title="No sponsors yet"
            description="Sponsors who accept your invitation will appear here."
          />
        ) : (
          <Card padded={false}>
            {sponsors.map((s, i) => (
              <Link
                key={s.id}
                to={`/admin/sponsors/${s.id}`}
                className={`flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group ${
                  i > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <Avatar name={s.name} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">
                    {s.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{s.email}</div>
                </div>
                <div className="hidden sm:block text-xs text-slate-400">
                  Joined {new Date(s.created_at).toLocaleDateString()}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}
