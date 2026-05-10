import type { HTMLAttributes, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  interactive?: boolean
  padded?: boolean
}

export default function Card({
  children,
  interactive = false,
  padded = true,
  className = '',
  ...rest
}: Props) {
  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(2,6,23,0.04),0_8px_24px_-8px_rgba(2,6,23,0.06)] ${padded ? 'p-5 sm:p-6' : ''} ${interactive ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-6px_rgba(2,6,23,0.12),0_16px_40px_-16px_rgba(2,6,23,0.18)] cursor-pointer' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
