'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Award, Calendar, CheckCircle, Clock, Flame, LucideIcon, Moon, Sparkles, Sun, Target, TrendingUp, Zap } from 'lucide-react'
import { Heatmap } from '@/components/Heatmap'
import { AiInsightsPanel } from '@/components/AiInsightsPanel'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'

interface StatsViewProps {
  stats: {
    todayMinutes: number
    yesterdayMinutes: number
    weekMinutes: number
    totalTasks: number
    completedTasks: number
    heatmapData: { date: string; value: number }[]
    totalMinutes: number
    streak: number
    achievements: string[]
  }
}

export function StatsView({ stats }: StatsViewProps) {
  const { t } = useLanguage()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('stats-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pomodoro_sessions',
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}${t('hours')} ${mins}${t('minutes')}`
    }
    return `${mins}${t('minutes')}`
  }

  const getLevelBadge = (minutes: number) => {
    if (minutes >= 6000) {
      return {
        name: t('badge_flowMaster'),
        icon: Zap,
        color: 'text-yellow-500',
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        desc: t('badge_flowMaster_desc')
      }
    }
    if (minutes >= 3000) {
      return {
        name: t('badge_focusExpert'),
        icon: Award,
        color: 'text-purple-500',
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        desc: t('badge_focusExpert_desc')
      }
    }
    if (minutes >= 600) {
      return {
        name: t('badge_advancedWalker'),
        icon: TrendingUp,
        color: 'text-blue-500',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        desc: t('badge_advancedWalker_desc')
      }
    }
    return {
      name: t('badge_beginner'),
      icon: Target,
      color: 'text-green-500',
      bg: 'bg-green-100 dark:bg-green-900/30',
      desc: t('badge_beginner_desc')
    }
  }

  const levelBadge = getLevelBadge(stats.totalMinutes)

  const cards = [
    {
      title: t('todayFocus'),
      value: formatTime(stats.todayMinutes),
      icon: Clock,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      trend: stats.yesterdayMinutes > 0
        ? Math.round(((stats.todayMinutes - stats.yesterdayMinutes) / stats.yesterdayMinutes) * 100)
        : null
    },
    {
      title: t('currentStreak'),
      value: `${stats.streak} ${t('days')}`,
      icon: Flame,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      title: t('completedTasks'),
      value: `${stats.completedTasks}/${stats.totalTasks}`,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: t('completionRate'),
      value: stats.totalTasks > 0
        ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%`
        : '0%',
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ]

  const achievementConfig: Record<string, { icon: LucideIcon, color: string, bg: string, label: string }> = {
    earlyBird: {
      icon: Sun,
      color: 'text-amber-500',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      label: t('badge_earlyBird')
    },
    nightOwl: {
      icon: Moon,
      color: 'text-indigo-500',
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      label: t('badge_nightOwl')
    },
    taskTerminator: {
      icon: Target,
      color: 'text-red-500',
      bg: 'bg-red-100 dark:bg-red-900/30',
      label: t('badge_taskTerminator')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="rounded-lg bg-gray-100 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              {t('return')}
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              📊 {t('statsTitle')}
            </h1>
          </div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:text-tomato dark:bg-gray-800 dark:text-gray-300"
          >
            <Sparkles className="h-4 w-4 text-tomato" />
            {t('reportTitle')}
          </Link>
        </header>

        <main className="space-y-8">
          <section className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="flex items-center gap-4">
              <div className={`rounded-full p-4 ${levelBadge.bg}`}>
                <levelBadge.icon className={`h-8 w-8 ${levelBadge.color}`} />
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{levelBadge.name}</h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700">
                    {t('currentBadge')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {levelBadge.desc}
                </p>
                <div className="mt-2 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className={`h-full ${levelBadge.color.replace('text-', 'bg-')}`}
                    style={{ width: `${Math.min(100, (stats.totalMinutes / 6000) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {stats.achievements.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-700">
                <h3 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('achievements')}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {stats.achievements.map(id => {
                    const config = achievementConfig[id]
                    if (!config) return null
                    return (
                      <div key={id} className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${config.bg}`}>
                        <config.icon className={`h-4 w-4 ${config.color}`} />
                        <span className="text-sm font-medium text-current">
                          {config.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cards.map(card => (
              <div key={card.title} className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
                <div className="flex items-center gap-4">
                  <div className={`rounded-xl p-3 ${card.bgColor}`}>
                    <card.icon className={card.color} size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{card.title}</p>
                    <div className="flex items-end gap-2">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                      {card.trend !== undefined && card.trend !== null && (
                        <span className={`mb-1 text-xs font-medium ${card.trend > 0 ? 'text-green-500' : card.trend < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                          {card.trend > 0 ? '+' : ''}{card.trend}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Calendar size={20} className="text-red-500" />
              {t('focusHeatmap')}
            </h2>
            <Heatmap data={stats.heatmapData} />
          </section>

          <AiInsightsPanel />
        </main>
      </div>
    </div>
  )
}
