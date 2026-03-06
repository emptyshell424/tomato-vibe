'use client'

import { useState, useCallback } from 'react'
import { Plus, Lightbulb, Sparkles } from 'lucide-react'
import { Task, AiTaskPlan } from '@/types'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'

import { TaskItem } from './TaskItem'
import { AiTaskPlannerModal } from './AiTaskPlannerModal'
import { useLanguage } from '@/contexts/LanguageContext'

interface TaskListProps {
  tasks: Task[]
  onAddTask: (title: string, estimatedPomodoros?: number) => Promise<void> | void
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onUpdateTask: (id: string, updates: Partial<Task>) => void
  onReorderTasks: (tasks: Task[]) => void
  activeTaskId?: string | null
  onSelectTask?: (task: { id: string; title: string } | null) => void
  canUseAiPlanner?: boolean
}

export function TaskList({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onReorderTasks,
  activeTaskId,
  onSelectTask,
  canUseAiPlanner = false,
}: TaskListProps) {
  const { t } = useLanguage()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAiPlannerOpen, setIsAiPlannerOpen] = useState(false)
  const [plannerSeed, setPlannerSeed] = useState('')

  const handleAddTask = async () => {
    if (newTaskTitle.trim()) {
      const regex = /^(.*?)\s*#(\d+)$/
      const match = newTaskTitle.trim().match(regex)

      if (match) {
        await onAddTask(match[1], parseInt(match[2], 10))
      } else {
        await onAddTask(newTaskTitle.trim())
      }
      setNewTaskTitle('')
    }
  }

  const handleSaveEdit = useCallback((id: string, newTitle: string) => {
    if (newTitle.trim()) {
      onUpdateTask(id, { title: newTitle.trim() })
    }
    setEditingId(null)
  }, [onUpdateTask])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
  }, [])

  const handleStartEdit = useCallback((id: string) => {
    setEditingId(id)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleAddTask()
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(tasks)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index,
    }))

    onReorderTasks(updatedItems)
  }

  const addExampleTask = () => {
    void onAddTask(t('addExampleTask'))
  }

  const openAiPlanner = () => {
    setPlannerSeed(newTaskTitle.trim())
    setIsAiPlannerOpen(true)
  }

  const handleImportPlannedTasks = async (plannedTasks: AiTaskPlan['subtasks']) => {
    for (const task of [...plannedTasks].reverse()) {
      await onAddTask(task.title, task.estimatedPomodoros)
    }
    setNewTaskTitle('')
    setIsAiPlannerOpen(false)
  }

  return (
    <>
      <div
        className="w-full max-w-md mx-auto"
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) {
            document.getElementById('task-input')?.focus()
          }
        }}
      >
        <div className="mb-8 space-y-3">
          <div className="flex gap-3 p-1.5 bg-gray-100/50 dark:bg-gray-800/50 rounded-2xl glass-card">
            <input
              id="task-input"
              type="text"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('addTaskPlaceholder')}
              className="flex-1 px-4 py-2 bg-transparent text-gray-900 dark:text-white
                     placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none"
            />
            <button
              onClick={() => void handleAddTask()}
              disabled={!newTaskTitle.trim()}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-tomato text-white font-medium
                     hover:bg-tomato-deep disabled:bg-gray-300 dark:disabled:bg-gray-700
                     shadow-sm hover:shadow-tomato/20 transition-all active:scale-95"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-[10px] text-gray-400 dark:text-gray-600 font-medium">
              {t('quickAddTip')}
            </p>
            <button
              onClick={openAiPlanner}
              disabled={!canUseAiPlanner}
              title={canUseAiPlanner ? t('aiPlannerTitle') : t('aiPlannerLocked')}
              className="inline-flex items-center gap-2 rounded-full border border-tomato/20 bg-white/80 dark:bg-gray-800/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-tomato shadow-sm transition-all hover:border-tomato/40 hover:bg-tomato/5 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 dark:disabled:border-gray-700 dark:disabled:text-gray-600"
            >
              <Sparkles size={14} />
              {t('aiPlannerBadge')}
            </button>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="task-list">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {tasks.map((task, index) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    index={index}
                    isActive={activeTaskId === task.id}
                    isEditing={editingId === task.id}
                    onToggle={onToggleTask}
                    onDelete={onDeleteTask}
                    onSelect={(t) => onSelectTask?.(t)}
                    onEditSave={handleSaveEdit}
                    onEditCancel={handleCancelEdit}
                    onEditStart={handleStartEdit}
                    onUpdateEstimate={(id, estimate) => onUpdateTask(id, { estimated_pomodoros: estimate })}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {tasks.length === 0 && (
          <div className="text-center py-20 px-6 rounded-3xl bg-gray-50/50 dark:bg-gray-800/20 border-2 border-dashed border-gray-100 dark:border-gray-800">
            <div className="flex flex-col items-center gap-6">
              <div className="relative group cursor-pointer" onClick={addExampleTask}>
                <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 shadow-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500">
                  <div className="w-16 h-16 rounded-full bg-tomato/10 flex items-center justify-center text-tomato">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                      <path d="M12 6V2" />
                      <path d="M16.24 7.76 19.07 4.93" />
                    </svg>
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-tomato text-white px-3 py-1 rounded-full text-[10px] font-black tracking-tighter uppercase shadow-lg animate-bounce">
                  {t('relaxed')}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t('waitingForGoal')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                  {t('emptyStateDesc')}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={addExampleTask}
                  className="mt-2 text-sm font-semibold text-tomato hover:text-tomato-deep transition-colors flex items-center gap-2 group"
                >
                  <Lightbulb size={16} className="group-hover:rotate-12 transition-transform" />
                  <span>{t('tryExample')}</span>
                </button>
                <p className="text-[10px] text-gray-400 dark:text-gray-600 font-medium">{t('quickAddTip')}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {isAiPlannerOpen && (
        <AiTaskPlannerModal
          key={plannerSeed || 'empty'}
          isOpen={isAiPlannerOpen}
          defaultTaskTitle={plannerSeed}
          onClose={() => setIsAiPlannerOpen(false)}
          onImport={handleImportPlannedTasks}
        />
      )}
    </>
  )
}
