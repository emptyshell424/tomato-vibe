'use client'

import React, { createContext, useContext, ReactNode, useState } from 'react'
import { usePomodoroTimer, usePomodoroSettings } from '@/hooks'
import { PomodoroMode } from '@/types'
import { useAuth } from './AuthContext'
import { saveSession } from '@/lib/supabase/sessions'

interface TimerContextType {
  mode: PomodoroMode
  timeLeft: number
  isRunning: boolean
  completedSessions: number
  isAlarmPlaying: boolean
  progress: () => number
  toggle: () => void
  resetTimer: () => void
  switchMode: (mode: PomodoroMode) => void
  stopAlarm: () => void
  adjustTime: (delta: number) => void
  start: () => void
  pause: () => void
  activeTask: { id: string; title: string } | null
  setActiveTask: (task: { id: string; title: string } | null) => void
}

const TimerContext = createContext<TimerContextType | undefined>(undefined)

export function TimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { settings } = usePomodoroSettings()
  const [activeTask, setActiveTask] = useState<{ id: string; title: string } | null>(null)

  const timer = usePomodoroTimer({
    focusDuration: settings.focusDuration,
    shortBreakDuration: settings.shortBreakDuration,
    longBreakDuration: settings.longBreakDuration,
    soundType: settings.soundType,
    soundVolume: settings.soundVolume,
    hapticsEnabled: settings.hapticsEnabled,
    taskId: activeTask?.id,
    onSessionComplete: async (mode, duration, taskId, startedAt) => {
      if (user && startedAt) {
        await saveSession({
          mode,
          duration,
          started_at: startedAt,
          task_id: taskId,
        })
      }
    }
  })

  return (
    <TimerContext.Provider value={{ ...timer, activeTask, setActiveTask }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const context = useContext(TimerContext)
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider')
  }
  return context
}
