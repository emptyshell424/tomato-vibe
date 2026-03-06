'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Brain, CalendarDays, Clock3, Loader2, RefreshCcw, Sparkles, Target, TrendingUp, TriangleAlert } from 'lucide-react'
import { clsx } from 'clsx'
import { AiInsightPeriod, FocusMomentum, FocusReport } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'

interface AiReportViewProps {
  initialReport: FocusReport
}

const momentumTheme: Record<FocusMomentum, string> = {
  surging: 'from-amber-500/25 via-orange-500/15 to-transparent text-amber-600 dark:text-amber-300',
  steady: 'from-emerald-500/25 via-teal-500/15 to-transparent text-emerald-600 dark:text-emerald-300',
  warming: 'from-sky-500/25 via-cyan-500/15 to-transparent text-sky-600 dark:text-sky-300',
  reset: 'from-rose-500/25 via-fuchsia-500/15 to-transparent text-rose-600 dark:text-rose-300',
}

function formatDate(date: string, language: 'en' | 'zh') {
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

function formatWeekday(weekday: number, language: 'en' | 'zh') {
  const reference = new Date(2024, 0, 7 + weekday)
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    weekday: 'short',
  }).format(reference)
}

function formatMinutesLabel(minutes: number, language: 'en' | 'zh') {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60
    return language === 'zh'
      ? `${hours}小时 ${remainder}分钟`
      : `${hours}h ${remainder}m`
  }

  return language === 'zh' ? `${minutes}分钟` : `${minutes} min`
}

function formatHourLabel(hour: number | null) {
  if (hour === null) return '--'
  return `${String(hour).padStart(2, '0')}:00`
}

export function AiReportView({ initialReport }: AiReportViewProps) {
  const { t, language } = useLanguage()
  const locale = language === 'zh' ? 'zh' : 'en'
  const [period, setPeriod] = useState<AiInsightPeriod>(initialReport.period)
  const [reports, setReports] = useState<Record<string, FocusReport>>({
    [`${initialReport.period}-${locale}`]: initialReport,
  })
  const [fetchedKeys, setFetchedKeys] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [requestError, setRequestError] = useState('')

  const reportKey = `${period}-${locale}`
  const report = reports[reportKey] ?? (period === initialReport.period ? initialReport : null)

  const fetchReport = useCallback(async (nextPeriod: AiInsightPeriod, force = false) => {
    const nextKey = `${nextPeriod}-${locale}`
    if (!force && fetchedKeys.includes(nextKey)) {
      return
    }

    setIsLoading(true)
    setRequestError('')

    try {
      const response = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: nextPeriod, language: locale }),
      })

      const payload = await response.json() as FocusReport | { error?: string }
      if (!response.ok || ('error' in payload && payload.error)) {
        throw new Error('error' in payload ? payload.error : t('reportLoadError'))
      }

      setReports(prev => ({
        ...prev,
        [nextKey]: payload as FocusReport,
      }))
      setFetchedKeys(prev => prev.includes(nextKey) ? prev : [...prev, nextKey])
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : t('reportLoadError'))
    } finally {
      setIsLoading(false)
    }
  }, [fetchedKeys, locale, t])

  useEffect(() => {
    void fetchReport(period)
  }, [period, fetchReport])

  const momentumLabel = useMemo(() => {
    const momentum = report?.momentum || initialReport.momentum
    const labels: Record<FocusMomentum, string> = {
      surging: t('reportMomentumSurging'),
      steady: t('reportMomentumSteady'),
      warming: t('reportMomentumWarming'),
      reset: t('reportMomentumReset'),
    }
    return labels[momentum]
  }, [initialReport.momentum, report?.momentum, t])

  if (!report && isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t('reportLoading')}
          </div>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {requestError || t('reportLoadError')}
          </div>
        </div>
      </div>
    )
  }

  const maxDailyMinutes = Math.max(...report.dailySeries.map(item => item.minutes), 1)
  const maxHourMinutes = Math.max(...report.hourSeries.map(item => item.minutes), 1)
  const maxWeekdayMinutes = Math.max(...report.weekdaySeries.map(item => item.minutes), 1)

  const cards = [
    {
      label: t('reportFocusTime'),
      value: formatMinutesLabel(report.totalMinutes, locale),
      detail: report.trendPercentage !== null
        ? `${report.trendPercentage > 0 ? '+' : ''}${report.trendPercentage}% ${t('reportTrendVsPrevious')}`
        : t('reportNoTrend'),
      icon: Clock3,
    },
    {
      label: t('reportSessions'),
      value: String(report.totalSessions),
      detail: `${report.previousTotalSessions} ${locale === 'zh' ? '场上周期' : 'last period'}`,
      icon: CalendarDays,
    },
    {
      label: t('reportActiveDays'),
      value: `${report.activeDays}/${report.period === 'weekly' ? 7 : 30}`,
      detail: t('reportMomentum'),
      icon: TrendingUp,
    },
    {
      label: t('reportAverageSession'),
      value: formatMinutesLabel(report.averageSessionMinutes, locale),
      detail: t('reportCompletionRate'),
      icon: Target,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-gray-600 shadow-sm transition hover:text-tomato dark:bg-gray-800 dark:text-gray-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-tomato/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-tomato">
                <Sparkles className="h-3.5 w-3.5" />
                AI
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                {t('reportTitle')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                {t('reportSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/stats"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-tomato/30 hover:text-tomato dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {t('statsTitle')}
            </Link>
            <div className="flex items-center gap-2 rounded-full bg-white p-1 shadow-sm dark:bg-gray-800">
              <button
                onClick={() => setPeriod('weekly')}
                className={clsx(
                  'rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition',
                  period === 'weekly'
                    ? 'bg-tomato text-white'
                    : 'text-gray-500 dark:text-gray-300'
                )}
              >
                {t('aiInsightsWeekly')}
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={clsx(
                  'rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition',
                  period === 'monthly'
                    ? 'bg-tomato text-white'
                    : 'text-gray-500 dark:text-gray-300'
                )}
              >
                {t('aiInsightsMonthly')}
              </button>
            </div>
            <button
              onClick={() => void fetchReport(period, true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              <RefreshCcw className={clsx('h-4 w-4', isLoading && 'animate-spin')} />
              {t('reportRefresh')}
            </button>
          </div>
        </header>

        <main className="mt-8 space-y-6">
          <section className="relative overflow-hidden rounded-[32px] bg-white p-6 shadow-xl shadow-tomato/5 dark:bg-gray-800">
            <div className={clsx('absolute inset-0 bg-gradient-to-br opacity-100', momentumTheme[report.momentum])} />
            <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                  {formatDate(report.rangeStart, locale)} - {formatDate(report.rangeEnd, locale)}
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                  {report.ai?.headline || t('reportTitle')}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300">
                  {report.ai?.summary || t('reportEmpty')}
                </p>
                {report.aiError && (
                  <div className="mt-4 inline-flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{t('reportAiFallback')}: {report.aiError}</span>
                  </div>
                )}
              </div>

              <div className="grid gap-4 rounded-[28px] border border-white/60 bg-white/70 p-5 backdrop-blur dark:border-gray-700/70 dark:bg-gray-900/50">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    {t('reportMomentum')}
                  </p>
                  <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                    {momentumLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    {t('reportBestDay')}
                  </p>
                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                    {report.bestDay.weekday !== null ? formatWeekday(report.bestDay.weekday, locale) : '--'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    {t('reportBestHour')}
                  </p>
                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                    {formatHourLabel(report.bestHour.hour)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {requestError && (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {requestError}
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(card => (
              <article key={card.label} className="rounded-[28px] bg-white p-5 shadow-lg shadow-gray-200/40 dark:bg-gray-800 dark:shadow-black/10">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  <card.icon className="h-5 w-5 text-tomato" />
                </div>
                <p className="mt-4 text-2xl font-black tracking-tight text-gray-900 dark:text-white">{card.value}</p>
                <p className="mt-2 text-xs font-medium text-gray-400 dark:text-gray-500">{card.detail}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-[30px] bg-white p-6 shadow-lg shadow-gray-200/40 dark:bg-gray-800 dark:shadow-black/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('reportDailyTrend')}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('reportSubtitle')}</p>
                </div>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              </div>
              <div className="mt-6 grid h-48 items-end gap-2" style={{ gridTemplateColumns: `repeat(${report.dailySeries.length}, minmax(0, 1fr))` }}>
                {report.dailySeries.map((item, index) => (
                  <div key={item.date} className="flex h-full flex-col justify-end">
                    <div
                      className="rounded-t-2xl bg-gradient-to-t from-tomato to-orange-300 transition-all"
                      style={{ height: `${Math.max(8, (item.minutes / maxDailyMinutes) * 100)}%` }}
                      title={`${formatDate(item.date, locale)}: ${formatMinutesLabel(item.minutes, locale)}`}
                    />
                    <span className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                      {report.period === 'weekly' || index % 4 === 0 ? formatDate(item.date, locale) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[30px] bg-white p-6 shadow-lg shadow-gray-200/40 dark:bg-gray-800 dark:shadow-black/10">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('reportWeekdayRhythm')}</h3>
              <div className="mt-6 space-y-4">
                {report.weekdaySeries.map(item => (
                  <div key={item.weekday}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">{formatWeekday(item.weekday, locale)}</span>
                      <span className="text-gray-400 dark:text-gray-500">{formatMinutesLabel(item.minutes, locale)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-tomato to-orange-300"
                        style={{ width: `${(item.minutes / maxWeekdayMinutes) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <article className="rounded-[30px] bg-white p-6 shadow-lg shadow-gray-200/40 dark:bg-gray-800 dark:shadow-black/10">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('reportTopTasks')}</h3>
              <div className="mt-6 space-y-4">
                {report.topTasks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
                    {t('reportEmpty')}
                  </div>
                )}
                {report.topTasks.map(task => {
                  const hasEstimate = Boolean(task.estimatedPomodoros && task.estimatedPomodoros > 0)
                  const progress = hasEstimate
                    ? Math.min(100, Math.round(((task.completedPomodoros ?? 0) / task.estimatedPomodoros!) * 100))
                    : null

                  return (
                    <div key={`${task.taskId || 'unassigned'}-${task.title || 'task'}`} className="rounded-3xl border border-gray-100 p-4 dark:border-gray-700">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{task.title || t('reportUnassignedTask')}</p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {formatMinutesLabel(task.minutes, locale)} · {task.sessions} {locale === 'zh' ? '场' : 'sessions'}
                          </p>
                        </div>
                        {task.completed && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                            {t('completedTasks')}
                          </span>
                        )}
                      </div>

                      {progress !== null && (
                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                            <span>Pomodoro</span>
                            <span>{task.completedPomodoros}/{task.estimatedPomodoros}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </article>

            <article className="rounded-[30px] bg-white p-6 shadow-lg shadow-gray-200/40 dark:bg-gray-800 dark:shadow-black/10">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('reportHourRhythm')}</h3>
              <div className="mt-6 grid h-52 grid-cols-12 gap-2 sm:grid-cols-24">
                {report.hourSeries.map(item => (
                  <div key={item.hour} className="flex h-full flex-col justify-end">
                    <div
                      className="rounded-t-xl bg-gradient-to-t from-sky-500 to-cyan-300"
                      style={{ height: `${Math.max(6, (item.minutes / maxHourMinutes) * 100)}%` }}
                      title={`${formatHourLabel(item.hour)} · ${formatMinutesLabel(item.minutes, locale)}`}
                    />
                    <span className="mt-2 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500">
                      {item.hour % 4 === 0 ? item.hour : ''}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="rounded-[32px] bg-white p-6 shadow-lg shadow-gray-200/40 dark:bg-gray-800 dark:shadow-black/10">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-tomato/10 p-3 text-tomato">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('aiInsightsTitle')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{report.ai?.petMessage || t('reportEmpty')}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-3xl bg-gray-50 p-5 dark:bg-gray-900/50">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  <Sparkles className="h-4 w-4 text-tomato" />
                  {t('reportHighlights')}
                </div>
                <ul className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                  {(report.ai?.highlights || []).map(item => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl bg-gray-50 p-5 dark:bg-gray-900/50">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  <TriangleAlert className="h-4 w-4 text-amber-500" />
                  {t('reportRisks')}
                </div>
                <ul className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                  {(report.ai?.risks || []).map(item => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl bg-gray-50 p-5 dark:bg-gray-900/50">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  <Target className="h-4 w-4 text-emerald-500" />
                  {t('reportSuggestions')}
                </div>
                <ul className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                  {(report.ai?.suggestions || []).map(item => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

