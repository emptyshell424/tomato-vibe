import { clsx } from 'clsx'
import { PomodoroMode } from '@/types'
import { Focus, Coffee, Battery, LucideIcon } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface ModeSelectorProps {
  currentMode: PomodoroMode
  onModeChange: (mode: PomodoroMode) => void
  sessionsCompleted: number
  sessionsBeforeLongBreak: number
  isRunning?: boolean
}

export function ModeSelector({
  currentMode,
  onModeChange,
  sessionsCompleted,
  sessionsBeforeLongBreak,
  isRunning,
}: ModeSelectorProps) {
  const { t } = useLanguage()
  const modes: { id: PomodoroMode; label: string; icon: LucideIcon }[] = [
    { id: 'focus', label: t('focus'), icon: Focus },
    { id: 'shortBreak', label: t('shortBreak'), icon: Coffee },
    { id: 'longBreak', label: t('longBreak'), icon: Battery },
  ]

  const completedDots = Array.from({ length: sessionsBeforeLongBreak }).map((_, i) => (
    <div
      key={i}
      className={clsx(
        'w-4 h-4 rounded-full transition-all duration-500 flex items-center justify-center',
        i < sessionsCompleted % sessionsBeforeLongBreak
          ? 'bg-tomato shadow-sm scale-110'
          : 'bg-gray-200 dark:bg-gray-700'
      )}
    >
      {i < sessionsCompleted % sessionsBeforeLongBreak && (
        <div className="w-1 h-1 bg-white rounded-full opacity-50" />
      )}
    </div>
  ))

  const handleModeChange = (mode: PomodoroMode) => {
    if (mode === currentMode) return

    if (isRunning) {
      if (!confirm(t('switchModeConfirm'))) {
        return
      }
    }
    onModeChange(mode)
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-1 p-1.5 bg-gray-100/50 dark:bg-gray-800/50 rounded-2xl glass-card">
        {modes.map(mode => (
          <button
            key={mode.id}
            onClick={() => handleModeChange(mode.id)}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300',
              currentMode === mode.id
                ? 'bg-white dark:bg-gray-700 text-tomato shadow-sm scale-105'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <mode.icon size={18} />
            <span className="text-sm">{mode.label}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/30 rounded-full">
        {completedDots}
      </div>
    </div>
  )
}
