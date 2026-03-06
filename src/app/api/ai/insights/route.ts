import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateProductivityInsight } from '@/lib/ai/productivity-insights'
import { hasAiConfig } from '@/lib/ai/client'
import { AiInsightPeriod } from '@/types'

interface InsightRequestBody {
  period?: AiInsightPeriod
}

interface SessionRow {
  started_at: string
  duration: number
}

function toWeekdayLabel(day: number) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] || 'Day'
}

function summarizeSessions(sessions: SessionRow[]) {
  const minutes = sessions.reduce((sum, session) => sum + session.duration / 60, 0)
  const countsByWeekday = new Array(7).fill(0)
  const minutesByWeekday = new Array(7).fill(0)
  const minutesByHour = new Array(24).fill(0)

  sessions.forEach(session => {
    const date = new Date(session.started_at)
    const weekday = date.getDay()
    const hour = date.getHours()
    const sessionMinutes = session.duration / 60

    countsByWeekday[weekday] += 1
    minutesByWeekday[weekday] += sessionMinutes
    minutesByHour[hour] += sessionMinutes
  })

  const topWeekdays = [...minutesByWeekday]
    .map((value, index) => ({ index, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)
    .map(item => toWeekdayLabel(item.index))

  const lowWeekdays = [...minutesByWeekday]
    .map((value, index) => ({ index, value }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 2)
    .map(item => toWeekdayLabel(item.index))

  const topHours = [...minutesByHour]
    .map((value, index) => ({ index, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .filter(item => item.value > 0)
    .map(item => `${item.index}:00`)

  const lowHours = [...minutesByHour]
    .map((value, index) => ({ index, value }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 3)
    .map(item => `${item.index}:00`)

  return {
    totalMinutes: Math.round(minutes),
    totalSessions: sessions.length,
    avgMinutes: sessions.length > 0 ? Math.round(minutes / sessions.length) : 0,
    topWeekdays,
    lowWeekdays,
    topHours,
    lowHours,
  }
}

export async function POST(request: Request) {
  if (!hasAiConfig()) {
    return NextResponse.json({ error: 'AI is not configured on the server.' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Please sign in before using AI insights.' }, { status: 401 })
  }

  let body: InsightRequestBody

  try {
    body = await request.json() as InsightRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const period: AiInsightPeriod = body.period === 'monthly' ? 'monthly' : 'weekly'
  const daysBack = period === 'monthly' ? 30 : 7
  const since = new Date()
  since.setDate(since.getDate() - daysBack)

  const { data: sessions, error } = await supabase
    .from('pomodoro_sessions')
    .select('started_at, duration')
    .eq('user_id', user.id)
    .eq('completed', true)
    .eq('mode', 'focus')
    .gte('started_at', since.toISOString())

  if (error) {
    return NextResponse.json({ error: 'Failed to load focus data.' }, { status: 500 })
  }

  const summary = summarizeSessions((sessions || []) as SessionRow[])
  const prompt = [
    `Period: ${period} (last ${daysBack} days).`,
    `Total focus minutes: ${summary.totalMinutes}.`,
    `Total sessions: ${summary.totalSessions}.`,
    `Average session minutes: ${summary.avgMinutes}.`,
    `Top weekdays: ${summary.topWeekdays.join(', ') || 'N/A'}.`,
    `Low weekdays: ${summary.lowWeekdays.join(', ') || 'N/A'}.`,
    `Top hours: ${summary.topHours.join(', ') || 'N/A'}.`,
    `Low hours: ${summary.lowHours.join(', ') || 'N/A'}.`,
    'Provide 2-3 actionable suggestions tailored to the data.',
  ].join('\n')

  try {
    const insight = await generateProductivityInsight(period, prompt)
    return NextResponse.json(insight)
  } catch (insightError) {
    const message = insightError instanceof Error ? insightError.message : 'AI insights failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
