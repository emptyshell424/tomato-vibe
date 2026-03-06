'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { AiInsight, AiInsightPeriod } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'

interface AiInsightsPanelProps {
  defaultPeriod?: AiInsightPeriod
}

export function AiInsightsPanel({ defaultPeriod = 'weekly' }: AiInsightsPanelProps) {
  const { t } = useLanguage()
  const [period, setPeriod] = useState<AiInsightPeriod>(defaultPeriod)
  const [insight, setInsight] = useState<AiInsight | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    const fetchInsights = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await fetch('/api/ai/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period }),
        })

        const payload = await response.json() as AiInsight | { error?: string }
        if (!response.ok || 'error' in payload) {
          throw new Error('error' in payload ? payload.error : t('aiInsightsError'))
        }

        if (isActive) {
          setInsight(payload as AiInsight)
        }
      } catch (requestError) {
        if (isActive) {
          setInsight(null)
          setError(requestError instanceof Error ? requestError.message : t('aiInsightsError'))
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    fetchInsights()

    return () => {
      isActive = false
    }
  }, [period, t])

  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles size={18} className="text-tomato" />
            {t('aiInsightsTitle')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">
            {t('aiInsightsSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-700 p-1">
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] rounded-full transition-colors ${period === 'weekly'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-300'
              }`}
          >
            {t('aiInsightsWeekly')}
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] rounded-full transition-colors ${period === 'monthly'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-300'
              }`}
          >
            {t('aiInsightsMonthly')}
          </button>
        </div>
      </div>

      <div className="mt-6">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            {t('aiInsightsLoading')}
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {!isLoading && !error && insight && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 p-4 text-sm text-gray-700 dark:text-gray-200">
              {insight.summary}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  {t('aiInsightsPeak')}
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                  {insight.peakTimes.map(item => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  {t('aiInsightsLow')}
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                  {insight.lowTimes.map(item => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-tomato/10 bg-tomato/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-tomato">
                {t('aiInsightsSuggestions')}
              </p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                {insight.suggestions.map(item => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                {t('aiInsightsHighlights')}
              </p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                {insight.highlights.map(item => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {!isLoading && !error && !insight && (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-6 text-sm text-gray-400 dark:text-gray-500">
            {t('aiInsightsEmpty')}
          </div>
        )}
      </div>
    </section>
  )
}


