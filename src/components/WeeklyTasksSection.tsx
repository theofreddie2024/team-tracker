import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Circle, Clock, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Member, MemberWeeklyTask, TaskStatus } from '../lib/types'
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_NEXT,
  currentWeekKey,
  formatWeekLabel,
  getWeeksInMonth,
} from '../lib/types'
import Button from './ui/Button'
import { Input } from './ui/Input'

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  not_started: <Circle className="w-3.5 h-3.5" />,
  in_progress: <Clock className="w-3.5 h-3.5" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5" />,
}

const STATUS_CLASSES: Record<TaskStatus, string> = {
  not_started: 'text-slate-500 bg-slate-100 border-slate-200',
  in_progress: 'text-sky-700 bg-sky-50 border-sky-200',
  completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
}

interface Props {
  monthKey: string
  sponsorId: string
  readOnly?: boolean
}

export default function WeeklyTasksSection({ monthKey, sponsorId, readOnly = false }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [tasks, setTasks] = useState<MemberWeeklyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [activeWeek, setActiveWeek] = useState('')
  const [addingFor, setAddingFor] = useState<string | null>(null) // `${week}::${memberId}`
  const [newTitles, setNewTitles] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const weeks = useMemo(() => getWeeksInMonth(monthKey), [monthKey])

  // Set active week: current week if in month, else first week of month
  useEffect(() => {
    if (weeks.length === 0) return
    const now = currentWeekKey()
    setActiveWeek(weeks.includes(now) ? now : weeks[0])
  }, [weeks])

  useEffect(() => {
    if (!sponsorId || weeks.length === 0) return
    let mounted = true
    Promise.all([
      supabase
        .from('members')
        .select('*')
        .eq('account_owner_id', sponsorId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('member_weekly_tasks')
        .select('*')
        .eq('sponsor_id', sponsorId)
        .in('week', weeks)
        .order('created_at'),
    ]).then(([m, t]) => {
      if (!mounted) return
      setMembers((m.data as Member[] | null) ?? [])
      setTasks((t.data as MemberWeeklyTask[] | null) ?? [])
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [sponsorId, monthKey])

  const tasksByKey = useMemo(() => {
    const map = new Map<string, MemberWeeklyTask[]>()
    for (const t of tasks) {
      const key = `${t.week}::${t.member_id}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [tasks])

  const addTask = async (week: string, memberId: string) => {
    const key = `${week}::${memberId}`
    const title = (newTitles[key] ?? '').trim()
    if (!title) return
    setSaving(true)
    const { data, error } = await supabase
      .from('member_weekly_tasks')
      .insert({ sponsor_id: sponsorId, member_id: memberId, week, title, status: 'not_started' })
      .select()
      .single()
    if (!error && data) {
      setTasks((prev) => [...prev, data as MemberWeeklyTask])
      setNewTitles((prev) => ({ ...prev, [key]: '' }))
      setAddingFor(null)
    }
    setSaving(false)
  }

  const cycleStatus = async (task: MemberWeeklyTask) => {
    const next = TASK_STATUS_NEXT[task.status]
    await supabase.from('member_weekly_tasks').update({ status: next }).eq('id', task.id)
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)))
  }

  const deleteTask = async (taskId: string) => {
    await supabase.from('member_weekly_tasks').delete().eq('id', taskId)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-xl" />
        ))}
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-4 text-center">
        No active members on your team yet.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Week tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        {weeks.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setActiveWeek(w)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeWeek === w
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {formatWeekLabel(w)}
          </button>
        ))}
      </div>

      {/* Members + their tasks for the active week */}
      <div className="space-y-2">
        {members.map((member) => {
          const key = `${activeWeek}::${member.id}`
          const memberTasks = tasksByKey.get(key) ?? []
          const isAdding = addingFor === key

          return (
            <div
              key={member.id}
              className="rounded-xl border border-slate-200 bg-white overflow-hidden"
            >
              {/* Member header */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <span className="flex-1 text-sm font-semibold text-slate-900">
                  {member.name}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setAddingFor(isAdding ? null : key)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add task
                  </button>
                )}
              </div>

              {/* Task rows */}
              <div className="divide-y divide-slate-100">
                {memberTasks.length === 0 && !isAdding && (
                  <p className="px-4 py-2.5 text-xs text-slate-400 italic">
                    No tasks this week.
                  </p>
                )}

                {memberTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                    {readOnly ? (
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${STATUS_CLASSES[task.status]}`}
                      >
                        {STATUS_ICON[task.status]}
                        {TASK_STATUS_LABELS[task.status]}
                      </span>
                    ) : (
                      <button
                        type="button"
                        title="Click to advance status"
                        onClick={() => cycleStatus(task)}
                        className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${STATUS_CLASSES[task.status]}`}
                      >
                        {STATUS_ICON[task.status]}
                        {TASK_STATUS_LABELS[task.status]}
                      </button>
                    )}

                    <span
                      className={`flex-1 text-sm ${
                        task.status === 'completed'
                          ? 'line-through text-slate-400'
                          : 'text-slate-800'
                      }`}
                    >
                      {task.title}
                    </span>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        aria-label="Delete task"
                        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Inline add row */}
                {isAdding && (
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <Input
                      autoFocus
                      type="text"
                      value={newTitles[key] ?? ''}
                      onChange={(e) =>
                        setNewTitles((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void addTask(activeWeek, member.id)
                        }
                        if (e.key === 'Escape') setAddingFor(null)
                      }}
                      placeholder="Task description…"
                      className="flex-1 text-sm h-8"
                    />
                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      loading={saving}
                      onClick={() => addTask(activeWeek, member.id)}
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddingFor(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
