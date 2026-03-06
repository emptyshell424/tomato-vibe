'use client'

import { useState } from 'react'
import { Sparkles, X, Loader2, Brain, CheckSquare2, Square } from 'lucide-react'
import { AiTaskPlan } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'

interface AiTaskPlannerModalProps {
  isOpen: boolean
  defaultTaskTitle: string
  onClose: () => void
  onImport: (tasks: AiTaskPlan['subtasks']) => Promise<void> | void
}

interface TaskPlanErrorResponse {
  error?: string
}

export function AiTaskPlannerModal({
  isOpen,
  defaultTaskTitle,
  onClose,
  onImport,
}: AiTaskPlannerModalProps) {
  const { t } = useLanguage()
  const [taskInput, setTaskInput] = useState(defaultTaskTitle)
  const [plan, setPlan] = useState<AiTaskPlan | null>(null)
  const [selectedTaskIndexes, setSelectedTaskIndexes] = useState<number[]>([])
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  if (!isOpen) return null

  const handleGenerate = async () => {
    const trimmedTask = taskInput.trim()
    if (!trimmedTask) {
      setError(t('aiPlannerTaskTooShort'))
      return
    }

    setError('')
    setIsGenerating(true)

    try {
      const response = await fetch('/api/ai/task-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task: trimmedTask }),
      })

      const payload = await response.json() as AiTaskPlan | TaskPlanErrorResponse
      if (!response.ok) {
        const errorMessage = 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : t('aiPlannerErrorGeneric')
        throw new Error(errorMessage)
      }

      if ('error' in payload) {
        throw new Error(payload.error || t('aiPlannerErrorGeneric'))
      }

      const nextPlan = payload as AiTaskPlan
      setPlan(nextPlan)
      setSelectedTaskIndexes(nextPlan.subtasks.map((_: AiTaskPlan['subtasks'][number], index: number) => index))
    } catch (requestError) {
      setPlan(null)
      setSelectedTaskIndexes([])
      setError(requestError instanceof Error ? requestError.message : t('aiPlannerErrorGeneric'))
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleTaskSelection = (index: number) => {
    setSelectedTaskIndexes(prev =>
      prev.includes(index) ? prev.filter(item => item !== index) : [...prev, index]
    )
  }

  const handleImport = async () => {
    if (!plan) return

    const selectedTasks = plan.subtasks.filter((_, index) => selectedTaskIndexes.includes(index))
    if (selectedTasks.length === 0) {
      setError(t('aiPlannerSelectAtLeastOne'))
      return
    }

    setError('')
    setIsImporting(true)

    try {
      await onImport(selectedTasks)
      onClose()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : t('aiPlannerErrorGeneric'))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl rounded-[32px] border border-white/20 bg-white/90 dark:bg-gray-900/90 shadow-2xl overflow-hidden"
        onClick={event => event.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-tomato/20 via-orange-400/10 to-transparent pointer-events-none" />
        <div className="absolute -top-14 -right-8 h-40 w-40 rounded-full bg-orange-400/20 blur-3xl pointer-events-none" />

        <div className="relative p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-tomato/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-tomato">
                <Sparkles size={14} />
                {t('aiPlannerBadge')}
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                  {t('aiPlannerTitle')}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400 max-w-xl">
                  {t('aiPlannerSubtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:text-gray-700 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="rounded-[28px] border border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-950/40 p-4 sm:p-5 space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <Brain size={16} className="text-tomato" />
              {t('aiPlannerInputLabel')}
            </label>
            <textarea
              value={taskInput}
              onChange={event => setTaskInput(event.target.value)}
              placeholder={t('aiPlannerPlaceholder')}
              className="min-h-28 w-full resize-none rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/20"
            />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-gray-400 dark:text-gray-500">
                {t('aiPlannerHint')}
              </p>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || isImporting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-tomato px-5 py-3 text-sm font-bold text-white shadow-lg shadow-tomato/20 transition-all hover:bg-tomato-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isGenerating ? t('aiPlannerGenerating') : t('aiPlannerGenerate')}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {plan ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1.6fr_0.8fr]">
                <div className="rounded-[24px] bg-gray-50 dark:bg-gray-800/70 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    {t('aiPlannerOverview')}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-gray-200">
                    {plan.overview}
                  </p>
                </div>
                <div className="rounded-[24px] bg-tomato text-white p-5 shadow-lg shadow-tomato/20">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                    {t('aiPlannerTotal')}
                  </p>
                  <p className="mt-3 text-4xl font-black tracking-tight">
                    {plan.totalPomodoros}
                  </p>
                  <p className="mt-2 text-sm text-white/80">
                    {t('pomodoros')}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {plan.subtasks.map((subtask, index) => {
                  const isSelected = selectedTaskIndexes.includes(index)

                  return (
                    <button
                      key={`${subtask.title}-${index}`}
                      onClick={() => toggleTaskSelection(index)}
                      className={`w-full rounded-[24px] border px-4 py-4 text-left transition-all ${isSelected
                        ? 'border-tomato/40 bg-tomato/5 shadow-[0_10px_30px_rgba(255,99,71,0.08)]'
                        : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5 text-tomato">
                          {isSelected ? <CheckSquare2 size={18} /> : <Square size={18} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                              {subtask.title}
                            </h3>
                            <span className="inline-flex w-fit items-center rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-300">
                              {subtask.estimatedPomodoros} {t('pomodoros')}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                            {subtask.reasoning}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || isImporting}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 px-5 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
                >
                  {t('aiPlannerRegenerate')}
                </button>
                <button
                  onClick={handleImport}
                  disabled={isGenerating || isImporting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 dark:bg-white px-5 py-3 text-sm font-bold text-white dark:text-gray-900 transition-colors hover:bg-gray-700 dark:hover:bg-gray-200 disabled:opacity-60"
                >
                  {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {t('aiPlannerImportSelected')}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-gray-200 dark:border-gray-700 px-6 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
              {t('aiPlannerEmpty')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



