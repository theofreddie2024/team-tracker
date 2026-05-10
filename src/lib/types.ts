export type Role = 'admin' | 'sponsor'

export type MemberStatus =
  // Pre-distributor stages
  | 'newbie'
  | 'pro'
  // Distributor ranks
  | 'full_distributor'
  | 'manager'
  | 'senior_manager'
  | 'executive_manager'
  // Director ranks
  | 'director'
  | 'emerald_director'
  | 'sapphire_director'
  // Ruby Director levels
  | 'ruby_1'
  | 'ruby_2'
  | 'ruby_3'
  | 'ruby_4'
  | 'ruby_5'
  // Diamond Director levels
  | 'diamond_1'
  | 'diamond_2'
  | 'diamond_3'
  | 'diamond_4'
  | 'diamond_5'

export type IncomeBracket =
  | 'none'
  | '250_500'
  | '500_1000'
  | '1000_plus'
  | 'occasional'
export type TrainingType = 'guest' | 'pro' | 'distributor'

export interface Profile {
  id: string
  email: string
  name: string
  role: Role
  invited_by_user_id: string | null
  promoted_from_member_id: string | null
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

export interface Member {
  id: string
  account_owner_id: string
  recruited_by_user_id: string | null
  recruited_by_member_id: string | null
  name: string
  status: MemberStatus
  income_bracket: IncomeBracket
  is_consistent: boolean
  attends_office_consistently: boolean
  is_trainer: boolean
  is_active: boolean
  joined_at: string
  first_earnings_at: string | null
  quit_at: string | null
  quit_reason: string | null
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  email: string
  invited_by_user_id: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
  promotes_member_id: string | null
}

export interface Training {
  id: string
  account_owner_id: string
  type: TrainingType
  title: string
  date: string // YYYY-MM-DD
  attendee_count: number
  notes: string | null
  created_at: string
}

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  guest: 'Guest training',
  pro: 'Pro training',
  distributor: 'Distributor training',
}

export const TRAINING_TYPE_SHORT: Record<TrainingType, string> = {
  guest: 'Guest',
  pro: 'Pro',
  distributor: 'Distributor',
}

export const INCOME_BRACKET_LABELS: Record<IncomeBracket, string> = {
  none: 'No earnings',
  '250_500': '$250–$500/mo',
  '500_1000': '$500–$1000/mo',
  '1000_plus': '$1000+/mo',
  occasional: 'Occasional (~once/3 months)',
}

export const STATUS_LABELS: Record<MemberStatus, string> = {
  newbie: 'Newbie',
  pro: 'Pro',
  full_distributor: 'Full Distributor',
  manager: 'Manager',
  senior_manager: 'Senior Manager',
  executive_manager: 'Executive Manager',
  director: 'Director',
  emerald_director: 'Emerald Director',
  sapphire_director: 'Sapphire Director',
  ruby_1: '1 Ruby Director',
  ruby_2: '2 Ruby Director',
  ruby_3: '3 Ruby Director',
  ruby_4: '4 Ruby Director',
  ruby_5: '5 Ruby Director',
  diamond_1: '1 Diamond Director',
  diamond_2: '2 Diamond Director',
  diamond_3: '3 Diamond Director',
  diamond_4: '4 Diamond Director',
  diamond_5: '5 Diamond Director',
}

export const STATUS_GROUPS: { label: string; statuses: MemberStatus[] }[] = [
  { label: 'Pre-distributor', statuses: ['newbie', 'pro'] },
  {
    label: 'Distributor ranks',
    statuses: [
      'full_distributor',
      'manager',
      'senior_manager',
      'executive_manager',
    ],
  },
  {
    label: 'Director ranks',
    statuses: ['director', 'emerald_director', 'sapphire_director'],
  },
  {
    label: 'Ruby Director',
    statuses: ['ruby_1', 'ruby_2', 'ruby_3', 'ruby_4', 'ruby_5'],
  },
  {
    label: 'Diamond Director',
    statuses: ['diamond_1', 'diamond_2', 'diamond_3', 'diamond_4', 'diamond_5'],
  },
]

const PRE_DISTRIBUTOR: ReadonlySet<MemberStatus> = new Set([
  'newbie',
  'pro',
])

export function isDistributor(status: MemberStatus): boolean {
  return !PRE_DISTRIBUTOR.has(status)
}

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

export const TRAINING_TYPE_TONES: Record<TrainingType, BadgeTone> = {
  guest: 'success',
  pro: 'accent',
  distributor: 'info',
}

export interface MonthlyAssessment {
  id: string
  sponsor_id: string
  month: string // YYYY-MM
  prospects_count: number
  prospects_stayed: number
  pro_trainings_attended: number
  pro_trainings_missed: number
  distributor_trainings_attended: number
  distributor_trainings_missed: number
  gigs_researched: number
  improvement_area: string | null
  next_plan_of_action: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function isValidMonth(m: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(m)
}

export function formatMonthLabel(m: string): string {
  if (!isValidMonth(m)) return m
  const [yStr, moStr] = m.split('-')
  const y = Number(yStr)
  const mo = Number(moStr)
  const d = new Date(y, mo - 1, 1)
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function shiftMonth(m: string, delta: number): string {
  const [yStr, moStr] = m.split('-')
  const d = new Date(Number(yStr), Number(moStr) - 1 + delta, 1)
  return currentMonthKey(d)
}

// =============================================================================
// Weekly tasks
// =============================================================================

export type TaskStatus = 'not_started' | 'in_progress' | 'completed'

export interface MemberWeeklyTask {
  id: string
  sponsor_id: string
  member_id: string
  week: string // YYYY-MM-DD, the Monday of the week
  title: string
  status: TaskStatus
  created_at: string
  updated_at: string
}

export interface TrainingAttendee {
  id: string
  training_id: string
  member_id: string
  created_at: string
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
}

export const TASK_STATUS_NEXT: Record<TaskStatus, TaskStatus> = {
  not_started: 'in_progress',
  in_progress: 'completed',
  completed: 'not_started',
}

// =============================================================================
// Week key utilities  (week key = Monday date string YYYY-MM-DD)
// =============================================================================

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun … 6=Sat
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

export function currentWeekKey(now: Date = new Date()): string {
  return getMondayOf(now).toISOString().slice(0, 10)
}

export function formatWeekLabel(weekKey: string): string {
  const monday = new Date(weekKey + 'T00:00:00')
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

/** Returns week keys (Monday dates) for every week that overlaps the given month. */
export function getWeeksInMonth(monthKey: string): string[] {
  if (!isValidMonth(monthKey)) return []
  const [year, month] = monthKey.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const weeks: string[] = []
  const cur = getMondayOf(firstDay)
  while (cur <= lastDay) {
    weeks.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 7)
  }
  return weeks
}

export const STATUS_TONES: Record<MemberStatus, BadgeTone> = {
  // Pre-distributor
  newbie: 'success',
  pro: 'accent',
  // Distributor working ranks
  full_distributor: 'neutral',
  manager: 'neutral',
  senior_manager: 'warning',
  executive_manager: 'warning',
  // Director ranks
  director: 'accent',
  emerald_director: 'success',
  sapphire_director: 'accent',
  // Ruby Director
  ruby_1: 'danger',
  ruby_2: 'danger',
  ruby_3: 'danger',
  ruby_4: 'danger',
  ruby_5: 'danger',
  // Diamond Director
  diamond_1: 'info',
  diamond_2: 'info',
  diamond_3: 'info',
  diamond_4: 'info',
  diamond_5: 'info',
}
