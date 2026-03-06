'use client'

import { Clock, Calendar, Target, TrendingUp, Award, Zap, Flame, Sun, Moon, CheckCircle, LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Heatmap } from '@/components/Heatmap'
import { AiInsightsPanel } from '@/components/AiInsightsPanel'
import { useLanguage } from '@/contexts/LanguageContext'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

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

    // Main Level Badge Logic
    const getLevelBadge = (minutes: number) => {
        if (minutes >= 6000) return {
            name: t('badge_flowMaster'),
            icon: Zap,
            color: 'text-yellow-500',
            bg: 'bg-yellow-100 dark:bg-yellow-900/30',
            desc: t('badge_flowMaster_desc')
        }
        if (minutes >= 3000) return {
            name: t('badge_focusExpert'),
            icon: Award,
            color: 'text-purple-500',
            bg: 'bg-purple-100 dark:bg-purple-900/30',
            desc: t('badge_focusExpert_desc')
        }
        if (minutes >= 600) return {
            name: t('badge_advancedWalker'),
            icon: TrendingUp,
            color: 'text-blue-500',
            bg: 'bg-blue-100 dark:bg-blue-900/30',
            desc: t('badge_advancedWalker_desc')
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
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <header className="flex items-center gap-4 mb-8">
                    <Link
                        href="/"
                        className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400
                       hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        {t('return')}
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        📊 {t('statsTitle')}
                    </h1>
                </header>

                <main className="space-y-8">
                    {/* Level Badge Section */}
                    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-full ${levelBadge.bg}`}>
                                <levelBadge.icon className={`w-8 h-8 ${levelBadge.color}`} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{levelBadge.name}</h2>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">
                                        {t('currentBadge')}
                                    </span>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    {levelBadge.desc}
                                </p>
                                <div className="mt-2 w-full max-w-sm h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${levelBadge.color.replace('text-', 'bg-')}`}
                                        style={{ width: `${Math.min(100, (stats.totalMinutes / 6000) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Achievements List */}
                        {stats.achievements.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                                    {t('achievements')}
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {stats.achievements.map(id => {
                                        const config = achievementConfig[id]
                                        if (!config) return null
                                        return (
                                            <div key={id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg}`}>
                                                <config.icon className={`w-4 h-4 ${config.color}`} />
                                                <span className={`text-sm font-medium ${config.color.replace('text-', 'text-')}`}>
                                                    {config.label}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Stats Cards */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {cards.map(card => (
                            <div
                                key={card.title}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${card.bgColor}`}>
                                        <card.icon className={card.color} size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {card.title}
                                        </p>
                                        <div className="flex items-end gap-2">
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {card.value}
                                            </p>
                                            {card.trend !== undefined && card.trend !== null && (
                                                <span className={`text-xs font-medium mb-1 ${card.trend > 0 ? 'text-green-500' : card.trend < 0 ? 'text-red-500' : 'text-gray-500'
                                                    }`}>
                                                    {card.trend > 0 ? '+' : ''}{card.trend}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* Heatmap */}
                    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
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


