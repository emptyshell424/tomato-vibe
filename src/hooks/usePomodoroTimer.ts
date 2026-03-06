'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PomodoroMode } from '@/types'

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const modeLabels: Record<PomodoroMode, string> = {
  focus: '专注中',
  shortBreak: '短休息',
  longBreak: '长休息',
}

interface UsePomodoroTimerProps {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  onSessionComplete?: (mode: PomodoroMode, duration: number, taskId?: string, startedAt?: string) => void
  taskId?: string | null
  soundType?: 'bell' | 'digital' | 'wood'
  soundVolume?: number
  hapticsEnabled?: boolean
}

function sendNotification(mode: PomodoroMode) {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  const titles = {
    focus: '专注时间结束',
    shortBreak: '短休息结束',
    longBreak: '长休息结束'
  }

  const bodies = {
    focus: '休息一下吧！喝口水，活动一下。',
    shortBreak: '准备好开始下一个专注时间了吗？',
    longBreak: '休息结束，精力充沛地开始工作吧！'
  }

  if (Notification.permission === 'granted') {
    new Notification(titles[mode], {
      body: bodies[mode],
      icon: '/favicon.ico',
      requireInteraction: true
    })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission()
  }
}

function triggerHaptics() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([100, 50, 100])
  }
}

const BASE64_BELL = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZzoAAAAPAAAAEAAADwAABwcHBwcHBwcHBwcHBwcHBwcHDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMP///8AAAALRE9NSRIAAAAAAABpY3VsdGNvbmZpZ3VyZSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+5BkAAAE8AUEsAFGAAAJ4AoAAAEMOQS/AAUoAAAnfCgAAAChU0FNTFJSRQCf9f7/1v7///6/////////////////////////////////////+nSAn1EAAAwAn9EgAA7iYp/REAAAMAn9C8An8mOf0RAADAn9C8An8mOf0RAADAn9C8An9Ejv0RAADAmf0RAADAmOf0RAADAmOf0RAADAmOf0RAADAmOf0RAADAmOf0RAADAmOf0RAADAnf9C8AAAAAAI8jI8jI8v/7kmQAAPXABW5AAU5AAArSBoAABH6P8SJIyPIyPL/+/+5JkAAD8AAAAAAI8jI8jI8v/7kmQAAL3ABW5AAU5AAArSBoAABH6P8SJIyPIyPL/+/+5JkAAL8AAAAAAI8jI8jI8v/7kmQAAPXABW5AAU5AAArSBoAABH6P8SJIyPIyPL/+/+5JkAAD8AAAAAAI8jI8jI8v/7kmQAAL3ABW5AAU5AAArSBoAABH6P8SJIyPIyPL/+/+5JkAAL8AAAAAAI8jI8jI8v/7kmQAAPXABW5AAU5AAArSBoAABH6P8SJIyPIyPL/+/+5JkAAD8AAAAAAI8jI8jI8v/7kmQAAL3ABW5AAU5AAArSBoAABH6P8SJIyPIyPL/+/+5JkAAL8AAAAAAI8jI8jI8v/7kmQAAPXABW5AAU5AAArSBoAABH6P8SJIyPIyPL/+/+5JkAAD8AAAAAAI8jI8jI8v/7kmQAAL3ABW5AAU5AAArSBoAABH6P8SJIyPIyPL/+/+5JkAAL8AAAAAAI8jI8jI8v/7kmQAAPXABW5AAU5AAArSBoAABH6P8SJIyPIyPL/+/+5JkAAD8AAAAAAI8jI8jI8v/7kmQAAL3ABW5AAU5AAArSBoAABH6P8SJIyPIyPL/+/+5JkAAL8AAAAAAI8jI8jI8v/7kmQAAPXABW5AAU5AAArSBoAABH6P8SJIyPIyPL/+/+5JkAAD8A'

const SOUND_URLS = {
  bell: 'https://cdn.pixabay.com/audio/2021/08/04/audio_06d8a3915f.mp3',
  digital: 'https://cdn.pixabay.com/audio/2022/03/15/audio_e6e5a6f3b0.mp3',
  wood: 'https://cdn.pixabay.com/audio/2021/08/04/audio_145d3de26d.mp3',
}

export function usePomodoroTimer({
  focusDuration,
  shortBreakDuration,
  longBreakDuration,
  onSessionComplete,
  taskId,
  soundType = 'bell',
  soundVolume = 0.5,
  hapticsEnabled = true,
}: UsePomodoroTimerProps) {
  const [mode, setMode] = useState<PomodoroMode>('focus')
  const [sessionDuration, setSessionDuration] = useState(focusDuration * 60)
  const [timeLeft, setTimeLeft] = useState(focusDuration * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null)
  const sessionStartedAtRef = useRef<string | null>(null)

  const stopAlarm = useCallback(() => {
    if (alarmAudioRef.current) {
      const audio = alarmAudioRef.current
      alarmAudioRef.current = null
      setIsAlarmPlaying(false)

      try {
        audio.pause()
        audio.currentTime = 0
      } catch {
        // Ignore silent stop failures.
      }
    }
  }, [])

  function playSynthesizedSound(type: 'bell' | 'digital' | 'wood', volume: number) {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return

      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      const now = ctx.currentTime
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(volume, now + 0.05)

      if (type === 'bell') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5)
        osc.start(now)
        osc.stop(now + 1.5)
      } else if (type === 'digital') {
        osc.type = 'square'
        osc.frequency.setValueAtTime(1000, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
        osc.start(now)
        osc.stop(now + 0.5)
      } else {
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(200, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
        osc.start(now)
        osc.stop(now + 0.3)
      }
    } catch (error) {
      console.error('Synthesized audio failed:', error)
    }
  }

  const playCompletionSound = useCallback((type: 'bell' | 'digital' | 'wood', volume: number) => {
    if (typeof window === 'undefined') return

    const tryPlay = (url: string, isFallback: boolean = false) => {
      stopAlarm()
      const audio = new Audio(url)
      audio.volume = volume
      alarmAudioRef.current = audio

      const playPromise = audio.play()
      if (playPromise !== undefined) {
        setIsAlarmPlaying(true)
        playPromise.catch((error) => {
          if (!isFallback) {
            console.warn(`Primary audio ${type} failed, trying fallback. Error:`, error.name)
            if (type === 'bell') tryPlay(BASE64_BELL, true)
            else playSynthesizedSound(type, volume)
          } else {
            console.error('Fallback audio also failed:', error)
            playSynthesizedSound(type, volume)
          }
        })

        audio.onended = () => {
          setIsAlarmPlaying(false)
          alarmAudioRef.current = null
        }
      }
    }

    try {
      tryPlay(SOUND_URLS[type])
    } catch (error) {
      console.warn('Audio initialization failed, using fallback', error)
      if (type === 'bell') tryPlay(BASE64_BELL, true)
      else playSynthesizedSound(type, volume)
    }
  }, [stopAlarm])

  const getDurationForMode = useCallback((currentMode: PomodoroMode) => {
    switch (currentMode) {
      case 'focus':
        return focusDuration * 60
      case 'shortBreak':
        return shortBreakDuration * 60
      case 'longBreak':
        return longBreakDuration * 60
    }
  }, [focusDuration, shortBreakDuration, longBreakDuration])

  const clearSessionClock = useCallback(() => {
    sessionStartedAtRef.current = null
  }, [])

  const resetTimer = useCallback(() => {
    stopAlarm()
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    const nextDuration = getDurationForMode(mode)
    clearSessionClock()
    setSessionDuration(nextDuration)
    setTimeLeft(nextDuration)
    setIsRunning(false)
  }, [mode, getDurationForMode, stopAlarm, clearSessionClock])

  const switchMode = useCallback((newMode: PomodoroMode) => {
    stopAlarm()
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    const nextDuration = getDurationForMode(newMode)
    clearSessionClock()
    setMode(newMode)
    setSessionDuration(nextDuration)
    setTimeLeft(nextDuration)
    setIsRunning(false)
  }, [getDurationForMode, stopAlarm, clearSessionClock])

  const adjustTime = useCallback((delta: number) => {
    if (mode !== 'focus') return

    setSessionDuration((currentDuration) => {
      const nextDuration = Math.max(60, Math.min(3600, currentDuration + delta))
      const appliedDelta = nextDuration - currentDuration

      setTimeLeft((currentTimeLeft) => {
        const nextTimeLeft = currentTimeLeft + appliedDelta
        return Math.max(60, Math.min(nextDuration, nextTimeLeft))
      })

      return nextDuration
    })
  }, [mode])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }

            playCompletionSound(soundType, soundVolume)
            sendNotification(mode)
            if (hapticsEnabled) triggerHaptics()
            onSessionComplete?.(mode, sessionDuration, taskId || undefined, sessionStartedAtRef.current || new Date().toISOString())
            clearSessionClock()
            setCompletedSessions(c => c + 1)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, mode, onSessionComplete, taskId, soundType, soundVolume, hapticsEnabled, playCompletionSound, sessionDuration, clearSessionClock])


  useEffect(() => {
    if (isRunning) {
      document.title = `(${formatTime(timeLeft)}) ${modeLabels[mode]} - 洋柿子氛围`
    } else {
      document.title = '洋柿子氛围'
    }
    return () => {
      document.title = '洋柿子氛围'
    }
  }, [timeLeft, isRunning, mode])

  const start = useCallback(() => {
    stopAlarm()
    if (timeLeft > 0) {
      if (!sessionStartedAtRef.current) {
        sessionStartedAtRef.current = new Date().toISOString()
      }
      setIsRunning(true)
    }
  }, [timeLeft, stopAlarm])

  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const toggle = useCallback(() => {
    if (isRunning) {
      pause()
    } else {
      start()
    }
  }, [isRunning, start, pause])

  const progress = useCallback(() => {
    const total = sessionDuration || getDurationForMode(mode)
    return total > 0 ? ((total - timeLeft) / total) * 100 : 0
  }, [mode, timeLeft, getDurationForMode, sessionDuration])

  return {
    mode,
    timeLeft,
    isRunning,
    completedSessions,
    isAlarmPlaying,
    toggle,
    resetTimer,
    switchMode,
    stopAlarm,
    progress,
    adjustTime,
    start,
    pause,
    formatTime,
  }
}

