'use client'

import { useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouter } from 'next/navigation'

interface HeatmapProps {
    data: { date: string; value: number }[]
}

export function Heatmap({ data }: HeatmapProps) {
    const { t } = useLanguage()
    const router = useRouter()

    const weeks = useMemo(() => {
        const today = new Date()
        const endDate = new Date(today)
        const startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 364) // Past year

        // Normalize map
        const dataMap = new Map(data.map(d => [d.date.split('T')[0], d.value]))

        const result = []
        let currentWeek: { date: string; value: number }[] = []

        // Align start date to Sunday/Monday? Let's say Sunday.
        const startDay = startDate.getDay()
        const loopDate = new Date(startDate)
        loopDate.setDate(loopDate.getDate() - startDay)

        while (loopDate <= endDate || currentWeek.length > 0) {
            if (currentWeek.length === 7) {
                result.push(currentWeek)
                currentWeek = []
                if (loopDate > endDate) break
            }

            const dateStr = loopDate.toISOString().split('T')[0]
            currentWeek.push({
                date: dateStr,
                value: dataMap.get(dateStr) || 0
            })

            loopDate.setDate(loopDate.getDate() + 1)
        }
        return result
    }, [data])

    const getColor = (value: number) => {
        if (value === 0) return 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
        if (value < 30) return 'bg-red-200 dark:bg-red-900/40 hover:bg-red-300 dark:hover:bg-red-900/60' // < 30 mins
        if (value < 60) return 'bg-red-300 dark:bg-red-800/60 hover:bg-red-400 dark:hover:bg-red-800/80' // < 1 hour
        if (value < 120) return 'bg-red-400 dark:bg-red-700/80 hover:bg-red-500 dark:hover:bg-red-700' // < 2 hours
        return 'bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-500' // > 2 hours
    }

    const handleDayClick = (date: string) => {
        router.push(`/history?date=${date}`)
    }

    return (
        <div className="w-full overflow-x-auto pb-2">
            <div className="flex gap-1 min-w-fit">
                {weeks.map((week, wIndex) => (
                    <div key={wIndex} className="flex flex-col gap-1">
                        {week.map(day => (
                            <div
                                key={day.date}
                                onClick={() => handleDayClick(day.date)}
                                className={`w-3 h-3 rounded-sm cursor-pointer transition-colors ${getColor(day.value)}`}
                                title={`${day.date}: ${Math.round(day.value)} ${t('minutes')}`}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <div className="flex justify-end items-center gap-2 mt-2 text-xs text-gray-400">
                <span>{t('less')}</span>
                <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded-sm" />
                <div className="w-3 h-3 bg-red-200 dark:bg-red-900/40 rounded-sm" />
                <div className="w-3 h-3 bg-red-300 dark:bg-red-800/60 rounded-sm" />
                <div className="w-3 h-3 bg-red-400 dark:bg-red-700/80 rounded-sm" />
                <div className="w-3 h-3 bg-red-500 dark:bg-red-600 rounded-sm" />
                <span>{t('more')}</span>
            </div>
        </div>
    )
}

