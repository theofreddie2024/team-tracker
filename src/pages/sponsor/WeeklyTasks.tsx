import { useState } from 'react'
import { ChevronLeft, ChevronRight, ListTodo } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { currentMonthKey, formatMonthLabel, shiftMonth } from '../../lib/types'
import WeeklyTasksSection from '../../components/WeeklyTasksSection'

export default function WeeklyTasks() {
  const { profile } = useAuth()
  const [monthKey, setMonthKey] = useState(currentMonthKey())

  if (!profile?.id) return null

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <ListTodo className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Weekly tasks
          </h1>
          <p className="text-slate-500 mt-1.5">
            Track what you need to do for each downline member, week by week.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(2,6,23,0.04)] px-3 py-2">
        <button
          type="button"
          onClick={() => setMonthKey((m) => shiftMonth(m, -1))}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>
        <span className="text-base font-semibold text-slate-900">
          {formatMonthLabel(monthKey)}
        </span>
        <button
          type="button"
          onClick={() => setMonthKey((m) => shiftMonth(m, 1))}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <WeeklyTasksSection
        key={monthKey}
        monthKey={monthKey}
        sponsorId={profile.id}
      />
    </div>
  )
}
