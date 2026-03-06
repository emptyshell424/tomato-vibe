export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak'

export interface PomodoroSettings {
  focusDuration: number // minutes
  shortBreakDuration: number // minutes
  longBreakDuration: number // minutes
  sessionsBeforeLongBreak: number
  sedentaryReminderEnabled: boolean
  sedentaryReminderInterval: number // minutes
  soundType: 'bell' | 'digital' | 'wood'
  soundVolume: number // 0-1
  whiteNoiseType: 'none' | 'rain' | 'cafe'
  whiteNoiseVolume: number // 0-1
  hapticsEnabled: boolean
}

export interface PomodoroSession {
  id: string
  user_id: string
  task_id?: string
  mode: PomodoroMode
  duration: number // seconds
  completed: boolean
  started_at: string
  completed_at?: string
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  estimated_pomodoros?: number
  completed_pomodoros: number
  completed: boolean
  order?: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  created_at: string
}

export interface ActiveTaskState {
  taskId: string | null
  taskTitle: string | null
}

export interface AiPlannedTask {
  title: string
  estimatedPomodoros: number
  reasoning: string
}

export interface AiTaskPlan {
  overview: string
  totalPomodoros: number
  subtasks: AiPlannedTask[]

}

export type AiInsightPeriod = 'weekly' | 'monthly'

export interface AiInsight {
  period: AiInsightPeriod
  summary: string
  peakTimes: string[]
  lowTimes: string[]
  suggestions: string[]
  highlights: string[]
}
