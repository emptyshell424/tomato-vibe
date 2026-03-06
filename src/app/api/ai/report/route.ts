import { NextResponse } from 'next/server'
import { AiInsightPeriod, FocusReport } from '@/types'
import { generateProductivityReport } from '@/lib/ai/productivity-report'
import { hasAiConfig } from '@/lib/ai/client'
import { getFocusReportOverview } from '@/lib/supabase/server-reports'

interface ReportRequestBody {
  period?: AiInsightPeriod
  language?: 'en' | 'zh'
}

export async function POST(request: Request) {
  let body: ReportRequestBody

  try {
    body = await request.json() as ReportRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const period: AiInsightPeriod = body.period === 'monthly' ? 'monthly' : 'weekly'
  const language = body.language === 'zh' ? 'zh' : 'en'
  const overview = await getFocusReportOverview(period)

  if (!overview) {
    return NextResponse.json({ error: 'Please sign in to view reports.' }, { status: 401 })
  }

  if (!hasAiConfig() || overview.totalSessions === 0) {
    return NextResponse.json(overview)
  }

  try {
    const ai = await generateProductivityReport(overview, language)
    const report: FocusReport = {
      ...overview,
      ai,
      aiError: null,
    }

    return NextResponse.json(report)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI report generation failed.'
    return NextResponse.json({
      ...overview,
      ai: null,
      aiError: message,
    } satisfies FocusReport)
  }
}
