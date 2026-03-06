import { AiInsightPeriod, AiReportNarrative, FocusReport } from '@/types'
import { requestAiJson } from './client'

interface ReportPayload {
  headline?: unknown
  summary?: unknown
  highlights?: unknown
  risks?: unknown
  suggestions?: unknown
  pet_message?: unknown
}

const ZH_SYSTEM_PROMPT = [
  '你是一名克制、专业的效率教练。',
  '请根据专注数据生成一份简洁的中文周报或月报，不要说教，不要夸张。',
  '只返回 JSON，结构必须严格如下：',
  '{',
  '  "headline": string,',
  '  "summary": string,',
  '  "highlights": string[],',
  '  "risks": string[],',
  '  "suggestions": string[],',
  '  "pet_message": string',
  '}',
].join('\n')

const EN_SYSTEM_PROMPT = [
  'You are a calm, pragmatic productivity coach.',
  'Write a concise weekly or monthly focus report in English. Avoid hype and judgement.',
  'Return JSON only with this exact shape:',
  '{',
  '  "headline": string,',
  '  "summary": string,',
  '  "highlights": string[],',
  '  "risks": string[],',
  '  "suggestions": string[],',
  '  "pet_message": string',
  '}',
].join('\n')

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback
  return value
    .map(item => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean)
}

function buildPrompt(report: FocusReport, period: AiInsightPeriod, language: 'zh' | 'en') {
  const topTasks = report.topTasks.length > 0
    ? report.topTasks.map(task => `${task.title || (language === 'zh' ? '未关联任务' : 'Unassigned')}: ${task.minutes}${language === 'zh' ? '分钟' : ' min'}`).join(', ')
    : (language === 'zh' ? '暂无' : 'None')

  const weekdayFocus = report.weekdaySeries
    .filter(item => item.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 3)
    .map(item => `${item.weekday}:${item.minutes}`)
    .join(', ')

  const hourFocus = report.hourSeries
    .filter(item => item.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 4)
    .map(item => `${item.hour}:00=${item.minutes}`)
    .join(', ')

  if (language === 'zh') {
    return [
      `周期：${period === 'weekly' ? '最近 7 天周报' : '最近 30 天月报'}。`,
      `总专注时长：${report.totalMinutes} 分钟。`,
      `上一周期专注时长：${report.previousTotalMinutes} 分钟。`,
      `总专注场次：${report.totalSessions}。`,
      `平均单次专注：${report.averageSessionMinutes} 分钟。`,
      `活跃天数：${report.activeDays}。`,
      `任务完成率：${report.completionRate}%。`,
      `最佳星期：${report.bestDay.weekday ?? '无'}。`,
      `最佳小时：${report.bestHour.hour !== null ? `${report.bestHour.hour}:00` : '无'}。`,
      `重点任务：${topTasks}。`,
      `高产星期分布：${weekdayFocus || '暂无'}。`,
      `高产小时分布：${hourFocus || '暂无'}。`,
      '请输出：一个标题、一段总结、2-3 条亮点、2 条风险提醒、3 条行动建议，以及一句给情绪宠物的口吻文案。',
    ].join('\n')
  }

  return [
    `Period: ${period === 'weekly' ? 'weekly report for the last 7 days' : 'monthly report for the last 30 days'}.`,
    `Total focus minutes: ${report.totalMinutes}.`,
    `Previous period minutes: ${report.previousTotalMinutes}.`,
    `Total sessions: ${report.totalSessions}.`,
    `Average session minutes: ${report.averageSessionMinutes}.`,
    `Active days: ${report.activeDays}.`,
    `Task completion rate: ${report.completionRate}%.`,
    `Best weekday index: ${report.bestDay.weekday ?? 'none'}.`,
    `Best hour: ${report.bestHour.hour !== null ? `${report.bestHour.hour}:00` : 'none'}.`,
    `Top tasks: ${topTasks}.`,
    `Top weekdays by minutes: ${weekdayFocus || 'none'}.`,
    `Top hours by minutes: ${hourFocus || 'none'}.`,
    'Return one headline, one summary paragraph, 2-3 highlights, 2 risks, 3 actionable suggestions, and one pet message.',
  ].join('\n')
}

function normalizeNarrative(payload: ReportPayload, language: 'zh' | 'en'): AiReportNarrative {
  const fallback = language === 'zh'
    ? {
      headline: '这段时间的专注节律已经整理好了',
      summary: '你最近的专注数据已经生成概要，可以据此继续优化节奏。',
      highlights: ['已经形成可读的专注轨迹。'],
      risks: ['注意避免把高强度时段排得过满。'],
      suggestions: ['把最重要的任务优先放进你的高效窗口。'],
      petMessage: '我已经记住你最近最稳的节奏啦。'
    }
    : {
      headline: 'Your recent focus rhythm is ready',
      summary: 'A concise overview of your recent focus pattern is now available.',
      highlights: ['Your focus history now shows a usable pattern.'],
      risks: ['Avoid overloading the hours where you already do your deepest work.'],
      suggestions: ['Place the most important work inside your strongest focus window.'],
      petMessage: 'I am learning your best rhythm.'
    }

  return {
    headline: typeof payload.headline === 'string' && payload.headline.trim() ? payload.headline.trim() : fallback.headline,
    summary: typeof payload.summary === 'string' && payload.summary.trim() ? payload.summary.trim() : fallback.summary,
    highlights: normalizeStringArray(payload.highlights, fallback.highlights),
    risks: normalizeStringArray(payload.risks, fallback.risks),
    suggestions: normalizeStringArray(payload.suggestions, fallback.suggestions),
    petMessage: typeof payload.pet_message === 'string' && payload.pet_message.trim() ? payload.pet_message.trim() : fallback.petMessage,
  }
}

export async function generateProductivityReport(report: FocusReport, language: 'zh' | 'en' = 'en') {
  const payload = await requestAiJson<ReportPayload>({
    systemPrompt: language === 'zh' ? ZH_SYSTEM_PROMPT : EN_SYSTEM_PROMPT,
    userPrompt: buildPrompt(report, report.period, language),
    temperature: 0.55,
  })

  return normalizeNarrative(payload, language)
}
