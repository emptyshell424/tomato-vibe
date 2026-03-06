import { AiTaskPlan, AiPlannedTask } from '@/types'
import { requestAiJson } from './client'

interface RawAiTaskPlan {
  overview?: unknown
  total_pomodoros?: unknown
  subtasks?: unknown
}

interface RawAiTaskPlanItem {
  title?: unknown
  estimated_pomodoros?: unknown
  reasoning?: unknown
}

const SYSTEM_PROMPT = [
  'You are a task planning assistant for a Pomodoro app.',
  'Break one large goal into 3 to 5 concrete subtasks.',
  'Each subtask must be actionable, short, and realistic for focused work sessions.',
  'Estimate Pomodoro counts conservatively using integers.',
  'Return JSON only with this exact shape:',
  '{',
  '  "overview": string,',
  '  "total_pomodoros": number,',
  '  "subtasks": [',
  '    { "title": string, "estimated_pomodoros": number, "reasoning": string }',
  '  ]',
  '}',
].join('\n')

function normalizeSubtask(item: RawAiTaskPlanItem): AiPlannedTask | null {
  const title = typeof item.title === 'string' ? item.title.trim() : ''
  const estimatedPomodoros = Number.isFinite(item.estimated_pomodoros)
    ? Math.max(1, Math.min(12, Math.round(Number(item.estimated_pomodoros))))
    : 1
  const reasoning = typeof item.reasoning === 'string' ? item.reasoning.trim() : ''

  if (!title) return null

  return {
    title,
    estimatedPomodoros,
    reasoning: reasoning || 'Sized for one concrete block of focused work.',
  }
}

function normalizeTaskPlan(raw: RawAiTaskPlan): AiTaskPlan {
  const subtasks = Array.isArray(raw.subtasks)
    ? raw.subtasks
        .map(item => normalizeSubtask(item as RawAiTaskPlanItem))
        .filter((item): item is AiPlannedTask => Boolean(item))
        .slice(0, 5)
    : []

  if (subtasks.length === 0) {
    throw new Error('AI plan did not include valid subtasks')
  }

  const totalPomodoros = Number.isFinite(raw.total_pomodoros)
    ? Math.max(1, Math.round(Number(raw.total_pomodoros)))
    : subtasks.reduce((sum, item) => sum + item.estimatedPomodoros, 0)

  return {
    overview: typeof raw.overview === 'string' && raw.overview.trim()
      ? raw.overview.trim()
      : 'A focused plan split into smaller execution steps.',
    totalPomodoros,
    subtasks,
  }
}

export async function generateTaskPlan(task: string) {
  const rawPlan = await requestAiJson<RawAiTaskPlan>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Task: ${task}`,
  })

  return normalizeTaskPlan(rawPlan)
}
