interface Props {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes: Record<NonNullable<Props['size']>, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

const palette = [
  'from-sky-500 to-sky-700',
  'from-indigo-500 to-indigo-700',
  'from-emerald-500 to-emerald-700',
  'from-amber-500 to-amber-700',
  'from-rose-500 to-rose-700',
  'from-violet-500 to-violet-700',
  'from-teal-500 to-teal-700',
  'from-fuchsia-500 to-fuchsia-700',
]

function hashIndex(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return Math.abs(h) % palette.length
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export default function Avatar({ name, size = 'md', className = '' }: Props) {
  return (
    <div
      className={`shrink-0 rounded-full bg-gradient-to-br text-white font-semibold flex items-center justify-center ${palette[hashIndex(name)]} ${sizes[size]} ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  )
}
