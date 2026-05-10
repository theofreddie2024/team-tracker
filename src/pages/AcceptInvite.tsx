import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import type { Invitation } from '../lib/types'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/ui/Button'
import { Field, Input } from '../components/ui/Input'

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorLoading, setErrorLoading] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let mounted = true
    if (!token) {
      setErrorLoading('Missing invite token.')
      setLoading(false)
      return
    }
    supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mounted) return
        if (error || !data) {
          setErrorLoading('Invitation not found or invalid.')
        } else {
          const inv = data as Invitation
          if (inv.accepted_at) setErrorLoading('This invitation has already been used.')
          else if (new Date(inv.expires_at) < new Date())
            setErrorLoading('This invitation has expired.')
          else setInvitation(inv)
        }
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!invitation) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const { error } = await signUp(invitation.email, password, name)
      if (error) setSubmitError(error.message)
      else setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AuthLayout title="Checking invitation…">
        <div className="text-center text-sm text-slate-500 py-4">Just a moment</div>
      </AuthLayout>
    )
  }

  if (errorLoading) {
    return (
      <AuthLayout title="Invitation problem">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-700 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="text-sm text-slate-700">{errorLoading}</p>
          <Link to="/sign-in">
            <Button variant="secondary" fullWidth>
              Go to sign in
            </Button>
          </Link>
        </div>
      </AuthLayout>
    )
  }

  if (submitted) {
    return (
      <AuthLayout title="Almost there">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm text-slate-700">
            Check your email to confirm your account, then sign in.
          </p>
          <Button variant="accent" fullWidth onClick={() => navigate('/sign-in')}>
            Continue to sign in
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Accept your invitation"
      subtitle={`You've been invited to join Team Tracker as a sponsor`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <Input value={invitation?.email ?? ''} disabled />
        </Field>
        <Field label="Your name" required>
          <Input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Jane Doe"
          />
        </Field>
        <Field label="Choose a password" required>
          <Input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="At least 6 characters"
          />
        </Field>

        {submitError && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-700">
            {submitError}
          </div>
        )}

        <Button
          type="submit"
          variant="accent"
          size="lg"
          loading={submitting}
          fullWidth
          className="mt-2"
        >
          Accept invitation
        </Button>
      </form>
    </AuthLayout>
  )
}
