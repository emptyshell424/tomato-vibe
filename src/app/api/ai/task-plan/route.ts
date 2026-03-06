import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTaskPlan } from '@/lib/ai/task-planner'
import { hasAiConfig } from '@/lib/ai/client'

interface TaskPlanRequestBody {
  task?: string
}

export async function POST(request: Request) {
  if (!hasAiConfig()) {
    return NextResponse.json({ error: 'AI is not configured on the server.' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Please sign in before using AI planning.' }, { status: 401 })
  }

  let body: TaskPlanRequestBody

  try {
    body = await request.json() as TaskPlanRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const task = body.task?.trim()
  if (!task || task.length < 3) {
    return NextResponse.json({ error: 'Please describe a task in more detail.' }, { status: 400 })
  }

  try {
    const plan = await generateTaskPlan(task)
    return NextResponse.json(plan)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI planning failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
