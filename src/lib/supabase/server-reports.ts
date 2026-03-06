import { AiInsightPeriod } from '@/types'
import { buildFocusReport, getReportPeriodDays, ReportSessionRecord, ReportTaskRecord } from '@/lib/reporting'
import { createClient } from './server'

export async function getFocusReportOverview(period: AiInsightPeriod) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const days = getReportPeriodDays(period)
  const today = new Date()
  const currentStart = new Date(today)
  currentStart.setHours(0, 0, 0, 0)
  currentStart.setDate(currentStart.getDate() - (days - 1))

  const previousStart = new Date(currentStart)
  previousStart.setDate(previousStart.getDate() - days)

  const [currentSessionsResult, previousSessionsResult, tasksResult] = await Promise.all([
    supabase
      .from('pomodoro_sessions')
      .select('started_at, duration, task_id, tasks(title)')
      .eq('user_id', user.id)
      .eq('completed', true)
      .eq('mode', 'focus')
      .gte('started_at', currentStart.toISOString()),
    supabase
      .from('pomodoro_sessions')
      .select('started_at, duration, task_id, tasks(title)')
      .eq('user_id', user.id)
      .eq('completed', true)
      .eq('mode', 'focus')
      .gte('started_at', previousStart.toISOString())
      .lt('started_at', currentStart.toISOString()),
    supabase
      .from('tasks')
      .select('id, title, estimated_pomodoros, completed_pomodoros, completed')
      .eq('user_id', user.id)
  ])

  if (currentSessionsResult.error) {
    console.error('Error loading current report sessions:', currentSessionsResult.error)
    return null
  }

  if (previousSessionsResult.error) {
    console.error('Error loading previous report sessions:', previousSessionsResult.error)
    return null
  }

  if (tasksResult.error) {
    console.error('Error loading report tasks:', tasksResult.error)
    return null
  }

  return buildFocusReport(
    period,
    (currentSessionsResult.data || []) as ReportSessionRecord[],
    (previousSessionsResult.data || []) as ReportSessionRecord[],
    (tasksResult.data || []) as ReportTaskRecord[]
  )
}
