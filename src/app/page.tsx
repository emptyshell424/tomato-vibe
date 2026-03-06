'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import { usePomodoroSettings, useSedentaryReminder } from '@/hooks'
import { useWhiteNoise } from '@/hooks/useWhiteNoise'
import { TimerDisplay } from '@/components/TimerDisplay'
import { ModeSelector } from '@/components/ModeSelector'

// 动态载入非首屏核心组件，减少主包体积
const SettingsPanel = dynamic(() => import('@/components/SettingsPanel').then(mod => mod.SettingsPanel), {
  ssr: false,
  loading: () => <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
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

import { useAuth } from '@/contexts/AuthContext'
import { useTimer } from '@/contexts/TimerContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Task } from '@/types'
import { Sun, Moon, LogOut, User as UserIcon, BarChart2, History, Maximize2, Minimize2 } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { getTasks, createTask as saveTaskToDB, updateTask as updateTaskInDB, deleteTask as deleteTaskFromDB } from '@/lib/supabase/tasks'


function PomodoroApp() {
  const { t } = useLanguage()
  const { user, signOut } = useAuth()
  const { settings, updateSettings, resetToDefaults } = usePomodoroSettings()

  const [tasks, setTasks] = useState<Task[]>([])
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
    setTimeLeft,
    activeTask,
    setActiveTask
  } = useTimer()

  const handleUpdateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    const previousTask = { ...task }
    setTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
      )
    )

    if (user) {
      const success = await updateTaskInDB(id, updates)
      if (!success) {
        setTasks(prev => prev.map(t => t.id === id ? previousTask : t))
      }
    }
  }, [tasks, user])
  // Handle task completion increment when a focus session ends
  const prevSessions = useRef(completedSessions)
  useEffect(() => {
    if (completedSessions > prevSessions.current) {
      if (mode === 'focus' && activeTask) {
        const task = tasks.find(t => t.id === activeTask.id)
        if (task) {
          const newCount = (task.completed_pomodoros || 0) + 1
          setTimeout(() => {
            handleUpdateTask(activeTask.id, { completed_pomodoros: newCount })
          }, 0)
        }
      }
    }
    prevSessions.current = completedSessions
  }, [completedSessions, mode, activeTask, tasks, handleUpdateTask])

  // White Noise Integration - Must be after timer to access state
  useWhiteNoise({
    type: settings.whiteNoiseType,
    volume: settings.whiteNoiseVolume,
    enabled: isRunning && mode === 'focus'
  })


  const { resetReminder } = useSedentaryReminder({
    enabled: settings.sedentaryReminderEnabled,
    interval: settings.sedentaryReminderInterval,
  })

  // 当切换到休息模式时，重置久坐提醒计时
  useEffect(() => {
    if (mode === 'shortBreak' || mode === 'longBreak') {
      resetReminder()
    }
  }, [mode, resetReminder])

  const loadTasks = useCallback(async () => {
    const data = await getTasks()
    setTasks(data)
  }, [])


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
    if (user) {
      const timeoutId = setTimeout(() => {
        loadTasks()
      }, 0)
      return () => clearTimeout(timeoutId)
    } else {
      const timeoutId = setTimeout(() => {
        setTasks([])
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [user, loadTasks])

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
        setTasks(prev => prev.map(t => t.id === tempTaskId ? savedTask : t))
      } else {
        setTasks(prev => prev.filter(t => t.id !== tempTaskId))
      }
    }
  }

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    const previousCompleted = task.completed
    setTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    )

    if (user) {
      const success = await updateTaskInDB(id, { completed: !previousCompleted })
      if (!success) {
        setTasks(prev =>
          prev.map(t =>
            t.id === id ? { ...t, completed: previousCompleted } : t
          )
        )
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
      const updates = reorderedTasks.map((task, index) =>
        updateTaskInDB(task.id, { order: index })
      )
      Promise.allSettled(updates)
    } else {
      localStorage.setItem('taskOrder', JSON.stringify(reorderedTasks.map(t => t.id)))
    }
  }, [user])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          toggle()
          break
        case 'r':
        case 'R':
          resetTimer()
          break
        case '+':
        case '=':
          if (mode === 'focus' && timeLeft < settings.focusDuration * 60 + 60 * 30) {
            setTimeLeft((prev: number) => Math.min(prev + 300, settings.focusDuration * 60 + 60 * 30))
          }
          break
        case '-':
          if (mode === 'focus' && timeLeft > 60) {
            setTimeLeft((prev: number) => Math.max(prev - 300, 60))
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle, resetTimer, mode, timeLeft, settings.focusDuration, setTimeLeft])

  // 不再阻塞整个页面的渲染，authLoading 仅用于某些按钮的状态
  // 保持核心计时器可以立即显示输出


  if (!user && showAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <AuthForm onSuccess={() => setShowAuth(false)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background transition-colors selection:bg-tomato/30 selection:text-tomato flex flex-col items-center">
      <div className={clsx(
        "container mx-auto px-4 py-6 sm:py-8 max-w-4xl transition-all duration-1000",
        isFocusMode ? "max-w-full" : ""
      )}>
        {!isFocusMode && (
          <header className="flex flex-wrap justify-between items-center gap-4 mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3 tracking-tighter">
              <span className="text-tomato drop-shadow-sm">🍅</span> {t('brandName')}
            </h1>
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
              {user ? (
                <>
                  <div className="flex items-center gap-2 text-gray-400 font-medium">
                    <UserIcon size={16} />
                    <span className="text-sm hidden sm:inline">{user.email}</span>
                  </div>
                  <button
                    onClick={signOut}
                    className="p-2 rounded-xl bg-white dark:bg-gray-800 text-gray-400 hover:text-tomato hover:shadow-lg transition-all"
                    title={t('logout')}
                  >
                    <LogOut size={18} />
                  </button>
                  <Link
                    href="/stats"
                    className="p-2 rounded-xl bg-white dark:bg-gray-800 text-gray-400 hover:text-tomato hover:shadow-lg transition-all"
                    title={t('statsTitle')}
                  >
                    <BarChart2 size={18} />
                  </Link>
                  <Link
                    href="/history"
                    className="p-2 rounded-xl bg-white dark:bg-gray-800 text-gray-400 hover:text-tomato hover:shadow-lg transition-all"
                    title={t('historyTitle')}
                  >
                    <History size={18} />
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="px-6 py-2 rounded-xl bg-tomato text-white font-bold text-sm hover:bg-tomato-deep shadow-lg shadow-tomato/20 transition-all active:scale-95"
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
                className="p-2 rounded-xl bg-white dark:bg-gray-800 text-gray-400 hover:text-tomato hover:shadow-lg transition-all"
                title={t('toggleTheme')}
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </header>
        )}

        {isFocusMode && (
          <div className="fixed top-8 right-8 z-50 animate-in fade-in duration-1000">
            <button
              onClick={() => setIsFocusMode(false)}
              className="p-4 bg-white/10 hover:bg-white/20 dark:bg-gray-800/10 dark:hover:bg-gray-800/20 backdrop-blur-xl rounded-2xl text-gray-400 hover:text-tomato transition-all"
            >
              <Minimize2 size={24} strokeWidth={2.5} />
            </button>
          </div>
        )}

        <main className={clsx(
          "flex flex-col items-center gap-12 transition-all duration-1000",
          isFocusMode ? "justify-center min-h-[80vh]" : ""
        )}>
          <section className={clsx(
            "relative w-full transition-all duration-1000 origin-center",
            isFocusMode ? "scale-125 saturate-150" : "glass-card p-12 rounded-[40px] max-w-2xl"
          )}>
            {!isFocusMode && (
              <div className="absolute top-6 right-6">
                <button
                  onClick={() => setIsFocusMode(true)}
                  className="p-3 text-gray-300 hover:text-tomato hover:bg-tomato/5 rounded-xl transition-all"
                  title={t('enterFocusMode')}
                >
                  <Maximize2 size={22} />
                </button>
              </div>
            )}

            <div className={clsx("transition-all duration-1000", isFocusMode ? "opacity-0 scale-75 pointer-events-none absolute w-full" : "mb-12")}>
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
              onAdjustTime={(delta) => {
                if (mode === 'focus') {
                  setTimeLeft(prev => Math.max(60, Math.min(3600, prev + delta)))
                }
              }}
            />
          </section>

          {!isFocusMode && (
            <>
              <section className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    {t('todaysPlan')}
                  </h2>
                  <div className="h-0.5 flex-1 mx-6 bg-gray-100 dark:bg-gray-800 rounded-full" />
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
                />
              </section>
            </>
          )}
        </main>
      </div>
      <WelcomePopup />
    </div >
  )
}

export default function Home() {
  return (
    <PomodoroApp />
  )
}





