'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, Trash2, Loader2, Calendar } from 'lucide-react'
import { ManualSessionModal } from './ManualSessionModal'

interface Session {
    id: string
    created_at: string
    user_id: string
    duration: number
    mode: string
    started_at: string
    completed: boolean
    tasks?: { title: string } | null
}

interface HistoryViewProps {
    sessions: Session[]
}

const PAGE_SIZE = 50

export function HistoryView({ sessions: initialSessions }: HistoryViewProps) {
    const { t, language } = useLanguage()
    const [sessions, setSessions] = useState<Session[]>(initialSessions)
    const [isLoading, setIsLoading] = useState(false)
    const [hasMore, setHasMore] = useState(initialSessions.length >= PAGE_SIZE)
    const [filterMode, setFilterMode] = useState<'all' | 'focus' | 'rest'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [isManualModalOpen, setIsManualModalOpen] = useState(false)

    // Observer ref
    const observerTarget = useRef<HTMLDivElement>(null)

    const fetchSessions = useCallback(async (reset = false) => {
        setIsLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        let query = supabase
            .from('pomodoro_sessions')
            .select('*, tasks(title)')
            .eq('user_id', user.id)
            .eq('completed', true)
            .order('started_at', { ascending: false })

        // Apply filters
        if (filterMode === 'focus') {
            query = query.eq('mode', 'focus')
        } else if (filterMode === 'rest') {
            query = query.in('mode', ['shortBreak', 'longBreak'])
        }

        // Apply search
        // Note: We handle search specifically below due to join constraints

        const currentLength = reset ? 0 : sessions.length
        const rangeStart = currentLength
        const rangeEnd = currentLength + PAGE_SIZE - 1

        let data: Session[] | null = null
        let error = null

        if (searchQuery.trim()) {
            const { data: searchData, error: searchError } = await supabase
                .from('pomodoro_sessions')
                .select('*, tasks!inner(title)')
                .eq('user_id', user.id)
                .eq('completed', true)
                .ilike('tasks.title', `%${searchQuery}%`)
                .order('started_at', { ascending: false })
                .range(rangeStart, rangeEnd)

            data = searchData
            error = searchError
        } else {
            query = query.range(rangeStart, rangeEnd)
            const result = await query
            data = result.data
            error = result.error
        }

        if (error) {
            console.error('Error fetching sessions:', error)
        } else {
            if (reset) {
                setSessions(data as Session[])
            } else {
                setSessions(prev => {
                    // Prevent duplicates if basic pagination race condition occurs
                    const existingIds = new Set(prev.map(s => s.id))
                    const newSessions = (data as Session[]).filter(s => !existingIds.has(s.id))
                    return [...prev, ...newSessions]
                })
            }
            // Check if we got fewer items than requested
            setHasMore((data?.length || 0) === PAGE_SIZE)
        }
        setIsLoading(false)
    }, [filterMode, searchQuery, sessions.length])

    // Effect to refetch when filters/search change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchSessions(true)
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [filterMode, searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

    // Intersection Observer for Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !isLoading) {
                    fetchSessions(false)
                }
            },
            { threshold: 0.1 }
        )

        if (observerTarget.current) {
            observer.observe(observerTarget.current)
        }

        return () => observer.disconnect()
    }, [hasMore, isLoading, fetchSessions])

    // Realtime subscription
    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel('history-db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'pomodoro_sessions'
                },
                () => {
                    fetchSessions(true)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchSessions])

    const handleDelete = async (id: string) => {
        if (!confirm(t('confirmDelete') || 'Are you sure you want to delete this record?')) return

        const supabase = createClient()
        const { error } = await supabase
            .from('pomodoro_sessions')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting session:', error)
            alert(t('errorDeleting') || 'Error deleting session')
        } else {
            setSessions(prev => prev.filter(s => s.id !== id))
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const formatDuration = (seconds: number) => {
        const minutes = Math.round(seconds / 60)
        return `${minutes}${t('minutes')}`
    }

    const modeLabels: Record<string, string> = {
        focus: t('focus'),
        shortBreak: t('shortBreak'),
        longBreak: t('longBreak'),
    }

    const modeColors: Record<string, string> = {
        focus: 'text-red-500 bg-red-50 dark:bg-red-900/20',
        shortBreak: 'text-green-500 bg-green-50 dark:bg-green-900/20',
        longBreak: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400
                       hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            {t('return')}
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            📜 {t('historyTitle')}
                        </h1>
                    </div>
                    <button
                        onClick={() => setIsManualModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {t('addRecord') || 'Add Record'}
                    </button>
                </header>

                {/* Filters & Search */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('searchTask') || 'Search tasks...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        />
                    </div>
                    <div className="flex w-full md:w-auto overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setFilterMode('all')}
                            className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium transition-colors ${filterMode === 'all'
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            {t('all') || 'All'}
                        </button>
                        <div className="w-px bg-gray-200 dark:bg-gray-700" />
                        <button
                            onClick={() => setFilterMode('focus')}
                            className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium transition-colors ${filterMode === 'focus'
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            {t('focus')}
                        </button>
                        <div className="w-px bg-gray-200 dark:bg-gray-700" />
                        <button
                            onClick={() => setFilterMode('rest')}
                            className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium transition-colors ${filterMode === 'rest'
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            {t('rest') || 'Rest'}
                        </button>
                    </div>
                </div>

                <main>
                    {sessions.length === 0 && !isLoading ? (
                        <div className="text-center py-12 text-gray-500">
                            {t('noHistory')}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {sessions.map(session => (
                                    <div
                                        key={session.id}
                                        className="group flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${modeColors[session.mode] || ''}`}>
                                                    {modeLabels[session.mode] || session.mode}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(session.started_at)}
                                                </span>
                                            </div>
                                            {session.tasks?.title && (
                                                <div className="text-sm font-medium text-gray-900 dark:text-white pl-1">
                                                    {session.tasks.title}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <span className="text-gray-600 dark:text-gray-300 font-medium">
                                                {formatDuration(session.duration)}
                                            </span>
                                            <button
                                                onClick={() => handleDelete(session.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title={t('delete') || 'Delete'}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Infinite Scroll Loader */}
                    {(hasMore || isLoading) && (
                        <div ref={observerTarget} className="mt-6 flex justify-center py-4">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>{t('loading') || 'Loading...'}</span>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <ManualSessionModal
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                onSave={() => {
                    fetchSessions(true)
                }}
            />
        </div>
    )
}

