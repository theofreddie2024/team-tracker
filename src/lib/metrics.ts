import type { IncomeBracket, Member, MemberStatus, Training, TrainingType } from './types'
import { isDistributor } from './types'

export interface MemberMetrics {
  total: number
  active: number
  quitters: number

  // Status composition (active only)
  newbies: number
  pros: number
  trainers: number
  distributors: number

  // Lineage (all members, active + quit)
  directLeg: number
  successLine: number

  // Distributor detail (active only)
  personalDistributors: number // direct leg + isDistributor
  teamDistributors: number // active + isDistributor (== distributors)
  consistentPersonal: number // direct leg + isDistributor + is_consistent
  consistentTeam: number // active + isDistributor + is_consistent
  inconsistentPersonal: number // direct leg + isDistributor + !is_consistent

  // Earnings (active only)
  earningsByBracket: Record<IncomeBracket, number>
  earningTotal: number // active members with any earnings (income_bracket !== 'none')

  // Quality (active only)
  attendingOffice: number
  consistentTotal: number // active + is_consistent
  newbiesWithEarnings: number // status=newbie + first_earnings_at != null

  // Quit info
  quitReasons: { reason: string; count: number }[]

  // Active distributor rank distribution
  ranks: Partial<Record<MemberStatus, number>>
}

const allBrackets: IncomeBracket[] = [
  '250_500',
  '500_1000',
  '1000_plus',
  'occasional',
  'none',
]

export function computeMetrics(
  members: Member[],
  opts: { sponsorId?: string } = {},
): MemberMetrics {
  const isDirect = (m: Member) =>
    opts.sponsorId
      ? m.recruited_by_user_id === opts.sponsorId
      : m.recruited_by_user_id !== null

  const active = members.filter((m) => m.is_active)
  const quit = members.filter((m) => !m.is_active)

  const earningsByBracket = allBrackets.reduce(
    (acc, b) => {
      acc[b] = 0
      return acc
    },
    {} as Record<IncomeBracket, number>,
  )
  for (const m of active) earningsByBracket[m.income_bracket]++

  const ranks: Partial<Record<MemberStatus, number>> = {}
  for (const m of active) ranks[m.status] = (ranks[m.status] ?? 0) + 1

  const quitReasonCounts = new Map<string, number>()
  for (const m of quit) {
    const reason = m.quit_reason?.trim() || 'Unspecified'
    quitReasonCounts.set(reason, (quitReasonCounts.get(reason) ?? 0) + 1)
  }
  const quitReasons = Array.from(quitReasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)

  return {
    total: members.length,
    active: active.length,
    quitters: quit.length,

    newbies: active.filter((m) => m.status === 'newbie').length,
    pros: active.filter((m) => m.status === 'pro').length,
    trainers: active.filter((m) => m.is_trainer).length,
    distributors: active.filter((m) => isDistributor(m.status)).length,

    directLeg: members.filter(isDirect).length,
    successLine: members.filter((m) => m.recruited_by_member_id !== null).length,

    personalDistributors: active.filter(
      (m) => isDirect(m) && isDistributor(m.status),
    ).length,
    teamDistributors: active.filter((m) => isDistributor(m.status)).length,
    consistentPersonal: active.filter(
      (m) => isDirect(m) && isDistributor(m.status) && m.is_consistent,
    ).length,
    consistentTeam: active.filter(
      (m) => isDistributor(m.status) && m.is_consistent,
    ).length,
    inconsistentPersonal: active.filter(
      (m) => isDirect(m) && isDistributor(m.status) && !m.is_consistent,
    ).length,

    earningsByBracket,
    earningTotal: active.filter((m) => m.income_bracket !== 'none').length,

    attendingOffice: active.filter((m) => m.attends_office_consistently).length,
    consistentTotal: active.filter((m) => m.is_consistent).length,
    newbiesWithEarnings: active.filter(
      (m) => m.status === 'newbie' && m.first_earnings_at !== null,
    ).length,

    quitReasons,
    ranks,
  }
}

export interface TrainingMetrics {
  total: number
  thisWeek: number
  thisMonth: number
  byType: Record<TrainingType, number>
  byTypeThisMonth: Record<TrainingType, number>
  guestAttendeesThisWeek: number
  guestAttendeesThisMonth: number
}

const startOfWeek = (now = new Date()): Date => {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day // ISO week (Monday start)
  d.setDate(d.getDate() + diff)
  return d
}

const startOfMonth = (now = new Date()): Date =>
  new Date(now.getFullYear(), now.getMonth(), 1)

export function computeTrainingMetrics(trainings: Training[]): TrainingMetrics {
  const week = startOfWeek()
  const month = startOfMonth()

  const byType: Record<TrainingType, number> = {
    guest: 0,
    pro: 0,
    distributor: 0,
  }
  const byTypeThisMonth: Record<TrainingType, number> = {
    guest: 0,
    pro: 0,
    distributor: 0,
  }
  let thisMonth = 0
  let thisWeek = 0
  let guestAttendeesThisMonth = 0
  let guestAttendeesThisWeek = 0

  for (const t of trainings) {
    byType[t.type]++
    const d = new Date(t.date + 'T00:00:00')
    if (d >= month) {
      thisMonth++
      byTypeThisMonth[t.type]++
      if (t.type === 'guest') guestAttendeesThisMonth += t.attendee_count
      if (d >= week) {
        thisWeek++
        if (t.type === 'guest') guestAttendeesThisWeek += t.attendee_count
      }
    }
  }

  return {
    total: trainings.length,
    thisWeek,
    thisMonth,
    byType,
    byTypeThisMonth,
    guestAttendeesThisWeek,
    guestAttendeesThisMonth,
  }
}
