import { createClient } from './client'
import { Task } from '@/types'

function isMissingOrderColumn(message: string | undefined) {
  return Boolean(message && /column .*order.* does not exist/i.test(message))
}

export async function getTasks(): Promise<Task[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  let { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error && isMissingOrderColumn(error.message)) {
    const fallback = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    data = fallback.data
    error = fallback.error
  }

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

  let nextOrder = 0

  const orderProbe = await supabase
    .from('tasks')
    .select('order')
    .eq('user_id', user.id)
    .order('order', { ascending: true })
    .limit(1)

  if (!orderProbe.error && orderProbe.data && orderProbe.data.length > 0) {
    const smallestOrder = orderProbe.data[0]?.order
    if (typeof smallestOrder === 'number' && Number.isFinite(smallestOrder)) {
      nextOrder = smallestOrder - 1
    }
  }

  const basePayload = {
    user_id: user.id,
    title: task.title,
    description: task.description || null,
    estimated_pomodoros: task.estimated_pomodoros || 0,
    completed_pomodoros: 0,
    completed: false,
  }

  let { data, error } = await supabase
    .from('tasks')
    .insert({
      ...basePayload,
      order: nextOrder,
    })
    .select()
    .single()

  if (error && isMissingOrderColumn(error.message)) {
    const fallback = await supabase
      .from('tasks')
      .insert(basePayload)
      .select()
      .single()

    data = fallback.data
    error = fallback.error
  }

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

  const payload: Record<string, unknown> = {
    ...dbUpdates,
    updated_at: new Date().toISOString(),
  }

  let { error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error && Object.prototype.hasOwnProperty.call(payload, 'order') && isMissingOrderColumn(error.message)) {
    const fallbackPayload = { ...payload }
    delete fallbackPayload.order

    const fallback = await supabase
      .from('tasks')
      .update(fallbackPayload)
      .eq('id', id)
      .eq('user_id', user.id)

    error = fallback.error
  }

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
