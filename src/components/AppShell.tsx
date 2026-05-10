import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserCog,
  LogOut,
  Menu,
  X,
  Sparkles,
  Presentation,
  ClipboardList,
  ChevronDown,
  Calendar,
  ListTodo,
  List,
  Network,
} from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import Avatar from './ui/Avatar'

type NavLeaf = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }
type NavParent = {
  label: string
  icon: typeof LayoutDashboard
  children: { to: string; label: string; icon: typeof LayoutDashboard }[]
}
type NavItem = NavLeaf | NavParent

const isParent = (item: NavItem): item is NavParent => 'children' in item

export default function AppShell() {
  const { profile, signOut } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems: NavItem[] = isAdmin
    ? [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
        {
          label: 'Sponsors',
          icon: UserCog,
          children: [
            { to: '/admin/sponsors', label: 'Sponsor list', icon: List },
            { to: '/admin/org', label: 'Org tree', icon: Network },
          ],
        },
        { to: '/admin/members', label: 'Members', icon: Users },
        { to: '/admin/trainings', label: 'Trainings', icon: Presentation },
        { to: '/admin/assessments', label: 'Assessments', icon: ClipboardList },
      ]
    : [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
        {
          label: 'My Team',
          icon: Users,
          children: [
            { to: '/members', label: 'Team list', icon: List },
            { to: '/team-tree', label: 'Team tree', icon: Network },
          ],
        },
        { to: '/trainings', label: 'Trainings', icon: Presentation },
        {
          label: 'Assessments',
          icon: ClipboardList,
          children: [
            { to: '/assessments', label: 'Monthly assessment', icon: Calendar },
            { to: '/weekly-tasks', label: 'Weekly tasks', icon: ListTodo },
          ],
        },
      ]

  return (
    <div className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link
            to={isAdmin ? '/admin' : '/'}
            className="flex items-center gap-2 group"
          >
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-slate-900 text-white shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="font-bold text-slate-900 tracking-tight">
              Team Tracker
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) =>
              isParent(item) ? (
                <DropdownNavItem key={item.label} item={item} />
              ) : (
                <NavLeafLink key={item.to} item={item} />
              ),
            )}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2.5 pl-2">
              <Avatar name={profile?.name ?? '?'} size="sm" />
              <div className="leading-tight">
                <div className="text-sm font-semibold text-slate-900">
                  {profile?.name}
                </div>
                <div className="text-xs text-slate-500 capitalize">
                  {profile?.role}
                </div>
              </div>
            </div>
            <button
              onClick={signOut}
              className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white">
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) =>
                isParent(item) ? (
                  <Fragment key={item.label}>
                    <div className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {item.label}
                    </div>
                    {item.children.map((child) => (
                      <MobileNavLink
                        key={child.to}
                        to={child.to}
                        label={child.label}
                        Icon={child.icon}
                        onSelect={() => setMobileOpen(false)}
                      />
                    ))}
                  </Fragment>
                ) : (
                  <MobileNavLink
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    Icon={item.icon}
                    end={item.end}
                    onSelect={() => setMobileOpen(false)}
                  />
                ),
              )}
              <div className="border-t border-slate-200 pt-3 mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar name={profile?.name ?? '?'} size="sm" />
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-slate-900">
                      {profile?.name}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">
                      {profile?.role}
                    </div>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}

function NavLeafLink({ item }: { item: NavLeaf }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-slate-900 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`
      }
    >
      <Icon className="w-4 h-4" />
      {item.label}
    </NavLink>
  )
}

function DropdownNavItem({ item }: { item: NavParent }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const Icon = item.icon

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close when navigating
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  const isActive = item.children.some(
    (c) =>
      location.pathname === c.to || location.pathname.startsWith(c.to + '/'),
  )

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer ${
          isActive
            ? 'bg-slate-900 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon className="w-4 h-4" />
        {item.label}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-white border border-slate-200 shadow-lg p-1.5 z-40"
        >
          {item.children.map((child) => {
            const ChildIcon = child.icon
            return (
              <NavLink
                key={child.to}
                to={child.to}
                role="menuitem"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <ChildIcon className="w-4 h-4 text-slate-400" />
                {child.label}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MobileNavLink({
  to,
  label,
  Icon,
  end,
  onSelect,
}: {
  to: string
  label: string
  Icon: typeof LayoutDashboard
  end?: boolean
  onSelect: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onSelect}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          isActive
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      <Icon className="w-4 h-4" />
      {label}
    </NavLink>
  )
}
