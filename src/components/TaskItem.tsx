'use client'

import { memo, useRef, useEffect, useState } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Check, Circle, GripVertical, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { Task } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'

interface TaskItemProps {
    task: Task
    index: number
    isActive: boolean
    isEditing: boolean
    onToggle: (id: string) => void
    onDelete: (id: string) => void
    onSelect: (task: { id: string; title: string }) => void
    onEditSave: (id: string, title: string) => void
    onEditCancel: () => void
    onEditStart: (id: string) => void
    onUpdateEstimate?: (id: string, estimate: number) => void
}

export const TaskItem = memo(function TaskItem({
    task,
    index,
    isActive,
    isEditing,
    onToggle,
    onDelete,
    onSelect,
    onEditSave,
    onEditCancel,
    onEditStart,
    onUpdateEstimate,
}: TaskItemProps) {
    const { t } = useLanguage()
    const inputRef = useRef<HTMLInputElement>(null)
    const [localTitle, setLocalTitle] = useState(task.title)

    useEffect(() => {
        if (isEditing) {
            requestAnimationFrame(() => inputRef.current?.focus())
        }
    }, [isEditing])

    const handleStartEdit = (e: React.MouseEvent) => {
        e.stopPropagation()
        setLocalTitle(task.title)
        onEditStart(task.id)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onEditSave(task.id, localTitle)
        if (e.key === 'Escape') onEditCancel()
    }

    const handleBlur = () => onEditSave(task.id, localTitle)

    const pomodoroIcons = Array.from({ length: task.estimated_pomodoros || 0 }).map((_, i) => (
        <div
            key={i}
            className={clsx(
                'w-2.5 h-2.5 rounded-full transition-all duration-300',
                i < (task.completed_pomodoros || 0)
                    ? 'bg-tomato shadow-[0_0_5px_rgba(255,99,71,0.5)]'
                    : 'bg-gray-200 dark:bg-gray-700'
            )}
        />
    ))

    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={clsx(
                        'group flex items-center gap-4 p-4 rounded-2xl transition-all duration-300',
                        isActive
                            ? 'glass-card ring-1 ring-tomato/20 bg-tomato/5 dark:bg-tomato/10'
                            : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/50 border border-transparent',
                        task.completed ? 'opacity-50' : '',
                        snapshot.isDragging && 'shadow-2xl ring-2 ring-tomato'
                    )}
                    onClick={() => onSelect({ id: task.id, title: task.title })}
                >
                    <div
                        {...provided.dragHandleProps}
                        className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-opacity"
                    >
                        <GripVertical size={18} />
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onToggle(task.id)
                        }}
                        className={clsx(
                            'flex-shrink-0 transition-all duration-300 transform hover:scale-110',
                            task.completed ? 'text-green-500' : 'text-gray-300 hover:text-tomato'
                        )}
                    >
                        {task.completed ? <Check size={22} strokeWidth={3} /> : <Circle size={22} strokeWidth={2} />}
                    </button>

                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 px-3 py-1.5 rounded-xl border border-tomato/30 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-tomato/20"
                        />
                    ) : (
                        <div
                            className="flex flex-col gap-1 flex-1 min-w-0"
                            onDoubleClick={handleStartEdit}
                        >
                            <span
                                className={clsx(
                                    'cursor-text truncate text-base font-medium transition-colors',
                                    task.completed
                                        ? 'text-gray-400 line-through'
                                        : 'text-gray-800 dark:text-gray-100'
                                )}
                            >
                                {task.title}
                            </span>
                            <div className="flex flex-wrap gap-1.5 min-h-[10px]">
                                {pomodoroIcons.length > 0 ? pomodoroIcons : (
                                    <span className="text-[10px] text-gray-400 dark:text-gray-600 italic">{t('noEstimate')}</span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        {!isEditing && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs text-gray-400 font-mono">{t('est')}</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    className="w-8 bg-transparent outline-none text-center hover:bg-black/5 dark:hover:bg-white/10 rounded-lg cursor-pointer text-sm font-bold text-gray-500"
                                    value={task.estimated_pomodoros || ''}
                                    placeholder="0"
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value)
                                        onUpdateEstimate?.(task.id, isNaN(val) ? 0 : val)
                                    }}
                                />
                            </div>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete(task.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            )}
        </Draggable>
    )
})
