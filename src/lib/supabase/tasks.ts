import { createClient } from './client'
import { Task } from '@/types'

export async function getTasks(): Promise<Task[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tasks:', error)
    return []
  }

  return data || []
}

export async function createTask(task: { title: string; description?: string; estimated_pomodoros?: number }): Promise<Task | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: task.title,
      description: task.description || null,
      estimated_pomodoros: task.estimated_pomodoros || 0,
      completed_pomodoros: 0,
      completed: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating task:', error)
    return null
  }

  return data
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const dbUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key]) => !['id', 'user_id', 'created_at'].includes(key))
  ) as Partial<Task>

  const { error } = await supabase
    .from('tasks')
    .update({
      ...dbUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error updating task:', error)
    return false
  }

  return true
}

export async function deleteTask(id: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting task:', error)
    return false
  }

  return true
}


