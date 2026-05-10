import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Search,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  currentMonthKey,
  formatMonthLabel,
  shiftMonth,
  type MonthlyAssessment,
  type Profile,
} from '../../lib/types'
import Card from '../../components/ui/Card'
import Avatar from '../../components/ui/Avatar'
import EmptyState from '../../components/ui/EmptyState'
import { Input, Select } from '../../components/ui/Input'
import AssessmentMonthSummary from '../../components/AssessmentMonthSummary'

export default function AdminAssessments() {
  const [assessments, setAssessments] = useState<MonthlyAssessment[] | null>(
    null,
  )
  const [sponsorMap, setSponsorMap] = useState<Map<string, Profile>>(new Map())
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState<string>(currentMonthKey())

  useEffect(() => {
    let mounted = true
    Promise.all([
      supabase
        .from('monthly_assessments')
        .select('*')
        .order('month', { ascending: false })
        .order('submitted_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'sponsor'),
    ]).then(([a, s]) => {
      if (!mounted) return
      setAssessments((a.data as MonthlyAssessment[] | null) ?? [])
      const map = new Map<string, Profile>()
      ;((s.data as Profile[] | null) ?? []).forEach((p) => map.set(p.id, p))
      setSponsorMap(map)
    })
    return () => {
      mounted = false
    }
  }, [])

  // Build month options from observed months + last 12 months
  const monthOptions = useMemo(() => {
    const set = new Set<string>()
    let cursor = currentMonthKey()
    for (let i = 0; i < 12; i++) {
      set.add(cursor)
      cursor = shiftMonth(cursor, -1)
    }
    for (const a of assessments ?? []) set.add(a.month)
    return Array.from(set).sort().reverse()
  }, [assessments])

  const filtered = useMemo(() => {
    if (!assessments) return []
    return assessments.filter((a) => {
      if (a.month !== month) return false
      if (search) {
        const q = search.toLowerCase()
        const sponsorName = sponsorMap.get(a.sponsor_id)?.name ?? ''
        if (!sponsorName.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [assessments, sponsorMap, month, search])

  const pendingSponsors = useMemo(() => {
    if (!assessments) return []
    const submittedIds = new Set(
      assessments.filter((a) => a.month === month).map((a) => a.sponsor_id),
    )
    const q = search.toLowerCase()
    return Array.from(sponsorMap.values())
      .filter((s) => !submittedIds.has(s.id))
      .filter((s) => (search ? s.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [assessments, sponsorMap, month, search])

  const submittedCount = filtered.length
  const totalSponsors = sponsorMap.size

  const loading = assessments === null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Monthly assessments
        </h1>
        <p className="text-slate-500 mt-1.5">
          Read sponsor self-reports for prospecting, training attendance, and
          monthly reflections.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Month
          </label>
          <Select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="sm:max-w-xs"
          >
            {monthOptions.map((mo) => (
              <option key={mo} value={mo}>
                {formatMonthLabel(mo)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Search sponsor
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sponsor name…"
              className="pl-9 sm:max-w-xs"
            />
          </div>
        </div>
      </div>

      {!loading && (
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900 tabular-nums">
            {submittedCount}
          </span>{' '}
          of{' '}
          <span className="font-semibold text-slate-900 tabular-nums">
            {totalSponsors}
          </span>{' '}
          sponsor{totalSponsors === 1 ? '' : 's'} submitted for{' '}
          <span className="font-semibold text-slate-900">
            {formatMonthLabel(month)}
          </span>
          .
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (
        <div className="space-y-8">
          {/* Aggregate summary across all submitted assessments for the month */}
          <AssessmentMonthSummary
            month={month}
            assessments={filtered}
            sponsorMap={sponsorMap}
          />

          {/* Pending — sponsors who haven't submitted yet */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Not yet submitted{' '}
                <span className="text-slate-400 font-normal">
                  ({pendingSponsors.length})
                </span>
              </h2>
            </div>
            {pendingSponsors.length === 0 ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Every sponsor has submitted for {formatMonthLabel(month)}.
              </div>
            ) : (
              <Card padded={false}>
                {pendingSponsors.map((s, i) => (
                  <Link
                    key={s.id}
                    to={`/admin/sponsors/${s.id}`}
                    className={`flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group ${
                      i > 0 ? 'border-t border-slate-100' : ''
                    }`}
                  >
                    <Avatar name={s.name} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {s.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        Hasn't submitted {formatMonthLabel(month)}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </Card>
            )}
          </section>

          {/* Submitted */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Submitted{' '}
                <span className="text-slate-400 font-normal">
                  ({filtered.length})
                </span>
              </h2>
            </div>
            {filtered.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="w-5 h-5" />}
                title={
                  search
                    ? 'No matches'
                    : `No submissions for ${formatMonthLabel(month)}`
                }
                description={
                  search
                    ? `No sponsors match "${search}".`
                    : 'Sponsors who fill out this month will show up here.'
                }
              />
            ) : (
              <Card padded={false}>
                {filtered.map((a, i) => {
                  const sponsor = sponsorMap.get(a.sponsor_id)
                  return (
                    <Link
                      key={a.id}
                      to={`/admin/assessments/${a.sponsor_id}/${a.month}`}
                      className={`flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group ${
                        i > 0 ? 'border-t border-slate-100' : ''
                      }`}
                    >
                      <Avatar name={sponsor?.name ?? '?'} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {sponsor?.name ?? '—'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {a.submitted_at
                            ? `Submitted ${new Date(a.submitted_at).toLocaleDateString()}`
                            : 'Draft'}
                          {' · '}
                          {a.prospects_count} prospects · {a.gigs_researched} gigs
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  )
                })}
              </Card>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
