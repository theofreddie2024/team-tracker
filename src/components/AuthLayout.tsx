import { Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-slate-900 text-white shadow-lg mb-4">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>}
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(2,6,23,0.04),0_20px_60px_-20px_rgba(2,6,23,0.15)] p-7">
          {children}
        </div>
        <div className="text-center text-xs text-slate-400 mt-6">
          Team Tracker · Network marketing team management
        </div>
      </div>
    </div>
  )
}
