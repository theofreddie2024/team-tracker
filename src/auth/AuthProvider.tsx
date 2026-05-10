import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const PROFILE_CACHE_KEY = 'tt:profile'

function readCachedProfile(): Profile | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Profile
  } catch {
    return null
  }
}

function writeCachedProfile(p: Profile | null) {
  try {
    if (p) sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p))
    else sessionStorage.removeItem(PROFILE_CACHE_KEY)
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cached = readCachedProfile()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(cached)
  // If we have a cached profile, render immediately and revalidate in the background
  const [loading, setLoading] = useState(!cached)

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.error('loadProfile error', error)
      return
    }
    const p = (data as Profile | null) ?? null
    setProfile(p)
    writeCachedProfile(p)
  }

  useEffect(() => {
    let mounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return
      setSession(newSession)

      if (!newSession || event === 'SIGNED_OUT') {
        setProfile(null)
        writeCachedProfile(null)
        setLoading(false)
        return
      }

      // Only the initial session and an explicit sign-in need a profile fetch.
      // Token refreshes leave the profile data unchanged.
      if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') {
        return
      }

      const userId = newSession.user.id
      const cachedNow = readCachedProfile()
      if (!cachedNow || cachedNow.id !== userId) {
        // No usable cache — must wait for the network round-trip
        await loadProfile(userId)
      } else {
        // Already have a cached profile; revalidate in the background
        void loadProfile(userId)
      }
      if (mounted) setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }

  const signUp: AuthContextValue['signUp'] = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    writeCachedProfile(null)
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id)
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
