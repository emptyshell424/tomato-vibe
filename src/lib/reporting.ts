import { AiInsightPeriod, FocusMomentum, FocusReport } from '@/types'

export interface ReportSessionRecord {
  started_at: string
  duration: number
  task_id: string | null
  tasks?: { title?: string | null } | Array<{ title?: string | null }> | null
}

export interface ReportTaskRecord {
  id: string
  title: string
  estimated_pomodoros: number | null
  completed_pomodoros: number | null
  completed: boolean | null
}

const PERIOD_DAYS: Record<AiInsightPeriod, number> = {
  weekly: 7,
  monthly: 30,
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function shiftDays(date: Date, delta: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + delta)
  return next
}

function toDateKey(date: Date) {
  return date.toISOString().split('T')[0]
}

function roundMinutes(seconds: number) {
  return Math.round(seconds / 60)
}

function extractTaskTitle(taskRelation: ReportSessionRecord['tasks']) {
  if (!taskRelation) return null
  if (Array.isArray(taskRelation)) {
    return typeof taskRelation[0]?.title === 'string' ? taskRelation[0].title : null
  }
  return typeof taskRelation.title === 'string' ? taskRelation.title : null
}

function resolveMomentum(totalMinutes: number, trendPercentage: number | null, activeDays: number, days: number): FocusMomentum {
  if (totalMinutes === 0) return 'reset'
  if (trendPercentage !== null && trendPercentage >= 25) return 'surging'
  if (trendPercentage !== null && trendPercentage <= -20) return 'reset'
  if (activeDays >= Math.ceil(days * 0.6)) return 'steady'
  return 'warming'
}

export function getReportPeriodDays(period: AiInsightPeriod) {
  return PERIOD_DAYS[period]
}

export function buildFocusReport(
  period: AiInsightPeriod,
  currentSessions: ReportSessionRecord[],
  previousSessions: ReportSessionRecord[],
  tasks: ReportTaskRecord[]
): FocusReport {
  const days = getReportPeriodDays(period)
  const today = new Date()
  const rangeStart = startOfDay(shiftDays(today, -(days - 1)))
  const rangeEnd = endOfDay(today)

  const dailyMinutes = new Map<string, number>()
  const taskMap = new Map(tasks.map(task => [task.id, task]))
  const taskAggregation = new Map<string, {
    taskId: string | null
    title: string | null
    minutes: number
    sessions: number
  }>()

  const weekdaySeries = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    minutes: 0,
    sessions: 0,
  }))

  const hourSeries = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    minutes: 0,
  }))

  let totalSeconds = 0

  currentSessions.forEach((session) => {
    const sessionDate = new Date(session.started_at)
    const minutes = session.duration / 60
    const dateKey = toDateKey(sessionDate)
    const weekday = sessionDate.getDay()
    const hour = sessionDate.getHours()
    const taskTitle = extractTaskTitle(session.tasks)
    const aggregationKey = session.task_id || taskTitle || 'unassigned'

    totalSeconds += session.duration
    dailyMinutes.set(dateKey, (dailyMinutes.get(dateKey) || 0) + minutes)
    weekdaySeries[weekday].minutes += minutes
    weekdaySeries[weekday].sessions += 1
    hourSeries[hour].minutes += minutes

    const currentTask = taskAggregation.get(aggregationKey)
    if (currentTask) {
      currentTask.minutes += minutes
      currentTask.sessions += 1
    } else {
      taskAggregation.set(aggregationKey, {
        taskId: session.task_id,
        title: taskTitle,
        minutes,
        sessions: 1,
      })
    }
  })

  const dailySeries = Array.from({ length: days }, (_, index) => {
    const currentDate = shiftDays(rangeStart, index)
    const dateKey = toDateKey(currentDate)
    return {
      date: dateKey,
      minutes: Math.round(dailyMinutes.get(dateKey) || 0),
    }
  })

  const totalMinutes = roundMinutes(totalSeconds)
  const previousTotalMinutes = roundMinutes(previousSessions.reduce((sum, session) => sum + session.duration, 0))
  const totalSessions = currentSessions.length
  const previousTotalSessions = previousSessions.length
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(task => Boolean(task.completed)).length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const activeDays = dailySeries.filter(day => day.minutes > 0).length
  const trendPercentage = previousTotalMinutes > 0
    ? Math.round(((totalMinutes - previousTotalMinutes) / previousTotalMinutes) * 100)
    : (totalMinutes > 0 ? 100 : null)

  const bestDay = weekdaySeries
    .filter(item => item.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)[0]

  const bestHour = hourSeries
    .filter(item => item.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)[0]

  const topTasks = Array.from(taskAggregation.values())
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5)
    .map(task => {
      const sourceTask = task.taskId ? taskMap.get(task.taskId) : undefined
      return {
        taskId: task.taskId,
        title: task.title,
        minutes: Math.round(task.minutes),
        sessions: task.sessions,
        estimatedPomodoros: sourceTask?.estimated_pomodoros ?? null,
        completedPomodoros: sourceTask?.completed_pomodoros ?? null,
        completed: Boolean(sourceTask?.completed),
      }
    })

  return {
    period,
    generatedAt: new Date().toISOString(),
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    totalMinutes,
    previousTotalMinutes,
    totalSessions,
    previousTotalSessions,
    averageSessionMinutes: totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0,
    activeDays,
    completionRate,
    totalTasks,
    completedTasks,
    trendPercentage,
    momentum: resolveMomentum(totalMinutes, trendPercentage, activeDays, days),
    bestDay: {
      weekday: bestDay?.weekday ?? null,
      minutes: Math.round(bestDay?.minutes || 0),
    },
    bestHour: {
      hour: bestHour?.hour ?? null,
      minutes: Math.round(bestHour?.minutes || 0),
    },
    dailySeries,
    weekdaySeries: weekdaySeries.map(item => ({
      weekday: item.weekday,
      minutes: Math.round(item.minutes),
      sessions: item.sessions,
    })),
    hourSeries: hourSeries.map(item => ({
      hour: item.hour,
      minutes: Math.round(item.minutes),
    })),
    topTasks,
    ai: null,
    aiError: null,
  }
}
