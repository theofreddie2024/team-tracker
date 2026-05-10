import type { ReactNode } from 'react'

interface Props {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export default function SectionCard({ title, icon, children, className = '' }: Props) {
  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(2,6,23,0.04),0_8px_24px_-8px_rgba(2,6,23,0.06)] p-5 sm:p-6 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            {icon}
          </div>
        )}
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}
