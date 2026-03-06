import { AiInsight, AiInsightPeriod } from '@/types'
import { requestAiJson } from './client'

interface InsightPayload {
  summary?: unknown
  peak_times?: unknown
  low_times?: unknown
  suggestions?: unknown
  highlights?: unknown
}

const SYSTEM_PROMPT = [
  'You are a productivity coach analyzing Pomodoro focus data.',
  'Provide concise insights and practical suggestions, avoid judgemental tone.',
  'Return JSON only with this exact shape:',
  '{',
  '  "summary": string,',
  '  "peak_times": string[],',
  '  "low_times": string[],',
  '  "suggestions": string[],',
  '  "highlights": string[]',
  '}',
].join('\n')

function normalizeStringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback
  return value
    .map(item => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean)
}

function normalizeInsight(period: AiInsightPeriod, payload: InsightPayload): AiInsight {
  return {
    period,
    summary: typeof payload.summary === 'string' && payload.summary.trim()
      ? payload.summary.trim()
      : 'Focus data highlights were generated for this period.',
    peakTimes: normalizeStringArray(payload.peak_times, ['Late morning', 'Early afternoon']),
    lowTimes: normalizeStringArray(payload.low_times, ['Late afternoon']),
    suggestions: normalizeStringArray(payload.suggestions, ['Schedule deeper focus blocks during peak windows.']),
    highlights: normalizeStringArray(payload.highlights, ['Consistent focus sessions logged this period.']),
  }
}

export async function generateProductivityInsight(period: AiInsightPeriod, prompt: string) {
  const rawInsight = await requestAiJson<InsightPayload>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: prompt,
    temperature: 0.5,
  })

  return normalizeInsight(period, rawInsight)
}
