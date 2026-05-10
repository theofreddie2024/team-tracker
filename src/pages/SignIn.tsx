import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/ui/Button'
import { Field, Input } from '../components/ui/Input'

export default function SignIn() {
  const { session, profile, signIn, signUp, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)

  if (!loading && session && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/'} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
          return
        }
        const state = location.state as { from?: { pathname?: string } } | null
        navigate(state?.from?.pathname ?? '/', { replace: true })
      } else {
        const { error } = await signUp(email, password, name)
        if (error) setError(error.message)
        else setSignupSuccess(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (signupSuccess) {
    return (
      <AuthLayout title="Check your email">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm text-slate-700">
            We sent a confirmation link to <span className="font-semibold">{email}</span>. Click it, then come back to sign in.
          </p>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setMode('signin')
              setSignupSuccess(false)
            }}
          >
            Back to sign in
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={mode === 'signin' ? 'Welcome back' : 'Create your account'}
      subtitle={
        mode === 'signin'
          ? 'Sign in to manage your team'
          : 'Get started with Team Tracker'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <Field label="Full name" required>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Jane Doe"
            />
          </Field>
        )}
        <Field label="Email" required>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete={mode === 'signin' ? 'email' : 'username'}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" required>
          <Input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="••••••••"
          />
        </Field>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
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
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>

        <div className="text-center text-sm text-slate-500 pt-1">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
            }}
            className="text-sky-700 hover:text-sky-900 font-semibold cursor-pointer"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}
