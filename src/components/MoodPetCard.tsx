'use client'

import { motion } from 'framer-motion'
import { Brain, Flame, Heart, Sparkles } from 'lucide-react'
import { PomodoroMode } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'

interface MoodPetCardProps {
  mode: PomodoroMode
  isRunning: boolean
  activeTask: { id: string; title: string } | null
  todayFocusMinutes: number
  completedSessions: number
  totalTasks: number
  completedTasks: number
}

type PetState = 'waiting' | 'focus' | 'rest' | 'proud' | 'tired' | 'celebrate'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function MoodPetCard({
  mode,
  isRunning,
  activeTask,
  todayFocusMinutes,
  completedSessions,
  totalTasks,
  completedTasks,
}: MoodPetCardProps) {
  const { t, language } = useLanguage()
  const completionRatio = totalTasks > 0 ? completedTasks / totalTasks : 0

  let state: PetState = 'waiting'
  if (isRunning && mode === 'focus') {
    state = 'focus'
  } else if (isRunning && mode !== 'focus') {
    state = 'rest'
  } else if (completedTasks > 0 && completionRatio >= 0.75) {
    state = 'celebrate'
  } else if (todayFocusMinutes >= 90 || completedSessions >= 4) {
    state = 'proud'
  } else if (totalTasks > 0 && todayFocusMinutes === 0) {
    state = 'tired'
  }

  const energy = clamp(68 - Math.round(todayFocusMinutes / 6) + (mode !== 'focus' && isRunning ? 18 : 0), 22, 100)
  const morale = clamp(40 + Math.round(completionRatio * 45) + Math.min(25, completedSessions * 6), 24, 100)
  const focus = clamp((isRunning && mode === 'focus' ? 82 : 28) + Math.min(28, completedSessions * 5) + (activeTask ? 10 : 0), 18, 100)

  const copy = {
    waiting: {
      title: t('petStateWaitingTitle'),
      body: t('petStateWaitingBody'),
      accent: 'from-slate-200 via-white to-orange-100 dark:from-slate-700 dark:via-slate-800 dark:to-orange-900/40',
      glow: 'shadow-slate-200/60 dark:shadow-slate-900/40',
    },
    focus: {
      title: t('petStateFocusTitle'),
      body: activeTask ? `${t('currentTask')}: ${activeTask.title}` : t('petStateFocusBody'),
      accent: 'from-orange-200 via-rose-100 to-orange-300 dark:from-orange-500/40 dark:via-rose-500/20 dark:to-amber-500/30',
      glow: 'shadow-orange-300/60 dark:shadow-orange-950/40',
    },
    rest: {
      title: t('petStateRestTitle'),
      body: t('petStateRestBody'),
      accent: 'from-emerald-100 via-teal-50 to-cyan-100 dark:from-emerald-500/30 dark:via-teal-500/20 dark:to-cyan-500/20',
      glow: 'shadow-emerald-200/60 dark:shadow-emerald-950/40',
    },
    proud: {
      title: t('petStateProudTitle'),
      body: language === 'zh'
        ? `今天已经累计 ${todayFocusMinutes} 分钟，节奏很稳。`
        : `You already logged ${todayFocusMinutes} focus minutes today.`,
      accent: 'from-violet-100 via-fuchsia-50 to-amber-100 dark:from-violet-500/30 dark:via-fuchsia-500/20 dark:to-amber-500/20',
      glow: 'shadow-violet-200/60 dark:shadow-violet-950/40',
    },
    tired: {
      title: t('petStateTiredTitle'),
      body: t('petStateTiredBody'),
      accent: 'from-sky-100 via-slate-50 to-indigo-100 dark:from-sky-500/20 dark:via-slate-500/10 dark:to-indigo-500/20',
      glow: 'shadow-sky-200/60 dark:shadow-sky-950/40',
    },
    celebrate: {
      title: t('petStateCelebrateTitle'),
      body: language === 'zh'
        ? `任务完成率已经到 ${Math.round(completionRatio * 100)}%，可以收下这次小庆祝。`
        : `Task completion is already at ${Math.round(completionRatio * 100)}%.`,
      accent: 'from-yellow-100 via-orange-50 to-rose-100 dark:from-yellow-500/30 dark:via-orange-500/20 dark:to-rose-500/20',
      glow: 'shadow-yellow-200/70 dark:shadow-yellow-950/40',
    },
  }[state]

  const statItems = [
    { label: t('petEnergy'), value: energy, icon: Heart, color: 'from-rose-400 to-orange-400' },
    { label: t('petMood'), value: morale, icon: Sparkles, color: 'from-violet-400 to-fuchsia-400' },
    { label: t('petFocus'), value: focus, icon: Brain, color: 'from-sky-400 to-cyan-400' },
  ]

  return (
    <section className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative overflow-hidden rounded-[36px] bg-white p-6 shadow-xl shadow-gray-200/40 dark:bg-gray-800 dark:shadow-black/10 lg:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,99,71,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_30%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-tomato/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-tomato">
              <Flame className="h-3.5 w-3.5" />
              MVP
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              {t('petTitle')}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-gray-500 dark:text-gray-400">
              {t('petSubtitle')}
            </p>

            <div className="mt-6 rounded-[28px] border border-white/60 bg-gray-50/80 p-5 backdrop-blur dark:border-gray-700 dark:bg-gray-900/50">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">{copy.title}</p>
              <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{copy.body}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">{t('petToday')}</p>
                  <p className="mt-2 text-xl font-black text-gray-900 dark:text-white">{todayFocusMinutes}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">{t('petSessionsLabel')}</p>
                  <p className="mt-2 text-xl font-black text-gray-900 dark:text-white">{completedSessions}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">{t('petCompletedLabel')}</p>
                  <p className="mt-2 text-xl font-black text-gray-900 dark:text-white">{completedTasks}/{totalTasks}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="flex items-center justify-center">
              <motion.div
                className={`relative h-64 w-64 rounded-[44%] bg-gradient-to-br ${copy.accent} ${copy.glow} shadow-2xl`}
                animate={{
                  y: state === 'focus' ? [0, -6, 0] : [0, -3, 0],
                  scale: state === 'celebrate' ? [1, 1.05, 1] : [1, 1.02, 1],
                  rotate: state === 'rest' ? [0, -2, 0, 2, 0] : [0, 1, 0, -1, 0],
                }}
                transition={{ duration: state === 'focus' ? 2.2 : 3.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="absolute left-10 top-6 h-10 w-10 rounded-full bg-white/55 blur-md dark:bg-white/10" />
                <div className="absolute right-10 top-14 h-12 w-12 rounded-full bg-white/40 blur-lg dark:bg-white/10" />
                <div className="absolute left-14 top-16 h-8 w-14 rounded-[999px] bg-white/80 dark:bg-gray-900/70" />
                <div className="absolute right-14 top-16 h-8 w-14 rounded-[999px] bg-white/80 dark:bg-gray-900/70" />
                <motion.div
                  className="absolute left-[4.7rem] top-[4.55rem] h-3.5 w-3.5 rounded-full bg-gray-900 dark:bg-white"
                  animate={{ y: state === 'rest' ? [0, 1, 0] : 0 }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute right-[4.7rem] top-[4.55rem] h-3.5 w-3.5 rounded-full bg-gray-900 dark:bg-white"
                  animate={{ y: state === 'rest' ? [0, 1, 0] : 0 }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className={`absolute left-1/2 top-[8.9rem] h-3 w-16 -translate-x-1/2 rounded-full ${state === 'rest' ? 'bg-emerald-500/70' : 'bg-gray-900/80 dark:bg-white/90'}`} />
                <div className="absolute left-1/2 top-6 h-10 w-12 -translate-x-1/2 rounded-b-[22px] rounded-t-[8px] bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-400/30" />
                <div className="absolute left-1/2 top-1 h-8 w-8 -translate-x-1/2 rounded-full bg-emerald-500" />
              </motion.div>
            </div>

            <div className="grid gap-4">
              {statItems.map(item => (
                <div key={item.label} className="rounded-3xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
                      <item.icon className="h-4 w-4 text-tomato" />
                      {item.label}
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">{item.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white dark:bg-gray-800">
                    <div className={`h-full rounded-full bg-gradient-to-r ${item.color}`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
