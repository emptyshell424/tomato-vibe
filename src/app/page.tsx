'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import { clsx } from 'clsx'
import { BarChart2, History, LogOut, Maximize2, Minimize2, Moon, Sparkles, Sun, User as UserIcon } from 'lucide-react'
import { usePomodoroSettings, useSedentaryReminder } from '@/hooks'
import { useWhiteNoise } from '@/hooks/useWhiteNoise'
import { TimerDisplay } from '@/components/TimerDisplay'
import { ModeSelector } from '@/components/ModeSelector'
import { MoodPetCard } from '@/components/MoodPetCard'
import { useAuth } from '@/contexts/AuthContext'
import { useTimer } from '@/contexts/TimerContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Task } from '@/types'
import { getTasks, createTask as saveTaskToDB, updateTask as updateTaskInDB, deleteTask as deleteTaskFromDB } from '@/lib/supabase/tasks'
import { getTodaySessions } from '@/lib/supabase/sessions'

const SettingsPanel = dynamic(() => import('@/components/SettingsPanel').then(mod => mod.SettingsPanel), {
  ssr: false,
  loading: () => <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
})

const TaskList = dynamic(() => import('@/components/TaskList').then(mod => mod.TaskList), {
  ssr: false,
  loading: () => <div className="h-40 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
})

const AuthForm = dynamic(() => import('@/components/AuthForm').then(mod => mod.AuthForm), {
  ssr: false
})

const WelcomePopup = dynamic(() => import('@/components/WelcomePopup').then(mod => mod.WelcomePopup), {
  ssr: false
})

function PomodoroApp() {
  const { t } = useLanguage()
  const { user, signOut } = useAuth()
  const { settings, updateSettings, resetToDefaults } = usePomodoroSettings()

  const [tasks, setTasks] = useState<Task[]>([])
  const [todayFocusMinutes, setTodayFocusMinutes] = useState(0)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return savedTheme === 'dark' || (!savedTheme && prefersDark)
  })
  const [showAuth, setShowAuth] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)

  const {
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
    activeTask,
    setActiveTask
  } = useTimer()

  const loadDashboardData = useCallback(async () => {
    if (!user) {
      setTasks([])
      setTodayFocusMinutes(0)
      return
    }

    const [taskData, minutes] = await Promise.all([
      getTasks(),
      getTodaySessions(),
    ])

    setTasks(taskData)
    setTodayFocusMinutes(Math.round(minutes))
  }, [user])

  const handleUpdateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    const previousTask = { ...task }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))

    if (user) {
      const success = await updateTaskInDB(id, updates)
      if (!success) {
        setTasks(prev => prev.map(t => t.id === id ? previousTask : t))
      }
    }
  }, [tasks, user])

  const prevSessions = useRef(completedSessions)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    if (completedSessions > prevSessions.current && mode === 'focus') {
      if (activeTask) {
        const task = tasks.find(t => t.id === activeTask.id)
        if (task) {
          const newCount = (task.completed_pomodoros || 0) + 1
          setTimeout(() => {
            void handleUpdateTask(activeTask.id, { completed_pomodoros: newCount })
          }, 0)
        }
      }

      timeoutId = setTimeout(() => {
        if (user) {
          void loadDashboardData()
        } else {
          setTodayFocusMinutes(prev => prev + settings.focusDuration)
        }
      }, user ? 450 : 0)
    }

    prevSessions.current = completedSessions

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [completedSessions, mode, activeTask, tasks, handleUpdateTask, user, settings.focusDuration, loadDashboardData])

  useWhiteNoise({
    type: settings.whiteNoiseType,
    volume: settings.whiteNoiseVolume,
    enabled: isRunning && mode === 'focus'
  })

  const { resetReminder } = useSedentaryReminder({
    enabled: settings.sedentaryReminderEnabled,
    interval: settings.sedentaryReminderInterval,
  })

  useEffect(() => {
    if (mode === 'shortBreak' || mode === 'longBreak') {
      resetReminder()
    }
  }, [mode, resetReminder])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadDashboardData()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [loadDashboardData])

  const handleAddTask = async (title: string, estimatedPomodoros?: number) => {
    const tempTaskId = crypto.randomUUID()
    const tempTask: Task = {
      id: tempTaskId,
      user_id: user?.id || 'demo-user',
      title,
      completed_pomodoros: 0,
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order: 0,
    }

    setTasks(prev => [tempTask, ...prev])

    if (user) {
      const savedTask = await saveTaskToDB({
        title,
        estimated_pomodoros: estimatedPomodoros,
      })

      if (savedTask) {
        setTasks(prev => prev.map(task => task.id === tempTaskId ? savedTask : task))
      } else {
        setTasks(prev => prev.filter(task => task.id !== tempTaskId))
      }
    }
  }

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    const previousCompleted = task.completed
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))

    if (user) {
      const success = await updateTaskInDB(id, { completed: !previousCompleted })
      if (!success) {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: previousCompleted } : t))
      }
    }
  }

  const handleDeleteTask = async (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id)
    setTasks(prev => prev.filter(t => t.id !== id))

    if (user && taskToDelete) {
      const success = await deleteTaskFromDB(id)
      if (!success) {
        setTasks(prev => [...prev, taskToDelete])
      }
    }
  }

  const handleReorderTasks = useCallback((reorderedTasks: Task[]) => {
    setTasks(reorderedTasks)

    if (user) {
      const updates = reorderedTasks.map((task, index) => updateTaskInDB(task.id, { order: index }))
      void Promise.allSettled(updates)
    } else {
      localStorage.setItem('taskOrder', JSON.stringify(reorderedTasks.map(task => task.id)))
    }
  }, [user])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

      switch (event.key) {
        case ' ':
          event.preventDefault()
          toggle()
          break
        case 'r':
        case 'R':
          resetTimer()
          break
        case '+':
        case '=':
          if (mode === 'focus' && timeLeft < 60 * 60) {
            adjustTime(300)
          }
          break
        case '-':
          if (mode === 'focus' && timeLeft > 60) {
            adjustTime(-300)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle, resetTimer, mode, timeLeft, adjustTime])

  if (!user && showAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <AuthForm onSuccess={() => setShowAuth(false)} />
      </div>
    )
  }

  const completedTaskCount = tasks.filter(task => task.completed).length

  return (
    <div className="flex min-h-screen flex-col items-center bg-background transition-colors selection:bg-tomato/30 selection:text-tomato">
      <div className={clsx(
        'container mx-auto max-w-4xl px-4 py-6 transition-all duration-1000 sm:py-8',
        isFocusMode && 'max-w-full'
      )}>
        {!isFocusMode && (
          <header className="mb-12 flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-1000">
            <h1 className="flex items-center gap-3 text-3xl font-black tracking-tighter text-gray-900 dark:text-white">
              <span className="text-tomato drop-shadow-sm">🍅</span> {t('brandName')}
            </h1>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
              {user ? (
                <>
                  <div className="flex items-center gap-2 font-medium text-gray-400">
                    <UserIcon size={16} />
                    <span className="hidden text-sm sm:inline">{user.email}</span>
                  </div>
                  <button
                    onClick={signOut}
                    className="rounded-xl bg-white p-2 text-gray-400 transition-all hover:text-tomato hover:shadow-lg dark:bg-gray-800"
                    title={t('logout')}
                  >
                    <LogOut size={18} />
                  </button>
                  <Link
                    href="/stats"
                    className="rounded-xl bg-white p-2 text-gray-400 transition-all hover:text-tomato hover:shadow-lg dark:bg-gray-800"
                    title={t('statsTitle')}
                  >
                    <BarChart2 size={18} />
                  </Link>
                  <Link
                    href="/reports"
                    className="rounded-xl bg-white p-2 text-gray-400 transition-all hover:text-tomato hover:shadow-lg dark:bg-gray-800"
                    title={t('reportTitle')}
                  >
                    <Sparkles size={18} />
                  </Link>
                  <Link
                    href="/history"
                    className="rounded-xl bg-white p-2 text-gray-400 transition-all hover:text-tomato hover:shadow-lg dark:bg-gray-800"
                    title={t('historyTitle')}
                  >
                    <History size={18} />
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="rounded-xl bg-tomato px-6 py-2 text-sm font-bold text-white shadow-lg shadow-tomato/20 transition-all active:scale-95 hover:bg-tomato-deep"
                >
                  {t('loginRegister')}
                </button>
              )}
              <SettingsPanel
                settings={settings}
                onSettingsChange={updateSettings}
                onReset={resetToDefaults}
              />
              <button
                onClick={() => setIsDark(!isDark)}
                className="rounded-xl bg-white p-2 text-gray-400 transition-all hover:text-tomato hover:shadow-lg dark:bg-gray-800"
                title={t('toggleTheme')}
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </header>
        )}

        {isFocusMode && (
          <div className="fixed right-8 top-8 z-50 animate-in fade-in duration-1000">
            <button
              onClick={() => setIsFocusMode(false)}
              className="rounded-2xl bg-white/10 p-4 text-gray-400 backdrop-blur-xl transition-all hover:bg-white/20 hover:text-tomato dark:bg-gray-800/10 dark:hover:bg-gray-800/20"
            >
              <Minimize2 size={24} strokeWidth={2.5} />
            </button>
          </div>
        )}

        <main className={clsx(
          'flex flex-col items-center gap-12 transition-all duration-1000',
          isFocusMode && 'min-h-[80vh] justify-center'
        )}>
          <section className={clsx(
            'relative w-full origin-center transition-all duration-1000',
            isFocusMode ? 'scale-125 saturate-150' : 'glass-card max-w-2xl rounded-[40px] p-12'
          )}>
            {!isFocusMode && (
              <div className="absolute right-6 top-6">
                <button
                  onClick={() => setIsFocusMode(true)}
                  className="rounded-xl p-3 text-gray-300 transition-all hover:bg-tomato/5 hover:text-tomato"
                  title={t('enterFocusMode')}
                >
                  <Maximize2 size={22} />
                </button>
              </div>
            )}

            <div className={clsx('transition-all duration-1000', isFocusMode ? 'pointer-events-none absolute w-full scale-75 opacity-0' : 'mb-12')}>
              <ModeSelector
                currentMode={mode}
                onModeChange={switchMode}
                sessionsCompleted={completedSessions}
                sessionsBeforeLongBreak={settings.sessionsBeforeLongBreak}
                isRunning={isRunning}
              />
            </div>

            <TimerDisplay
              timeLeft={timeLeft}
              isRunning={isRunning}
              mode={mode}
              progress={progress()}
              onToggle={toggle}
              onReset={resetTimer}
              isAlarmPlaying={isAlarmPlaying}
              onStopAlarm={stopAlarm}
              activeTask={activeTask}
              onAdjustTime={adjustTime}
            />
          </section>

          {!isFocusMode && (
            <>
              <MoodPetCard
                mode={mode}
                isRunning={isRunning}
                activeTask={activeTask}
                todayFocusMinutes={todayFocusMinutes}
                completedSessions={completedSessions}
                totalTasks={tasks.length}
                completedTasks={completedTaskCount}
              />

              <section className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                <div className="mb-8 flex items-center justify-between">
                  <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                    {t('todaysPlan')}
                  </h2>
                  <div className="mx-6 h-0.5 flex-1 rounded-full bg-gray-100 dark:bg-gray-800" />
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    {tasks.length} {tasks.length === 1 ? t('task') : t('tasks')}
                  </span>
                </div>
                <TaskList
                  tasks={tasks}
                  onAddTask={handleAddTask}
                  onToggleTask={handleToggleTask}
                  onDeleteTask={handleDeleteTask}
                  onUpdateTask={handleUpdateTask}
                  onReorderTasks={handleReorderTasks}
                  activeTaskId={activeTask?.id}
                  onSelectTask={setActiveTask}
                  canUseAiPlanner={Boolean(user)}
                />
              </section>
            </>
          )}
        </main>
      </div>
      <WelcomePopup />
    </div>
  )
}

export default function Home() {
  return <PomodoroApp />
}


