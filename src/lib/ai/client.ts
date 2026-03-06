interface AiChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

interface AiJsonRequest {
  systemPrompt: string
  userPrompt: string
  temperature?: number
}

type AiProvider = 'deepseek' | 'gemini' | 'openai'

function getAiConfig() {
  const provider = (process.env.AI_PROVIDER as AiProvider | undefined) || 'deepseek'
  const model = process.env.AI_MODEL || (provider === 'gemini' ? 'gemini-3-flash-preview' : 'deepseek-chat')
  const baseUrl = (process.env.AI_BASE_URL || (provider === 'gemini'
    ? 'https://generativelanguage.googleapis.com/v1beta/openai'
    : 'https://api.deepseek.com/v1')).replace(/\/$/, '')
  const apiKey = provider === 'gemini' ? process.env.GOOGLE_API_KEY : process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    const keyName = provider === 'gemini' ? 'GOOGLE_API_KEY' : 'DEEPSEEK_API_KEY'
    throw new Error(`${keyName} is not configured`)
  }

  return { apiKey, model, baseUrl }
}

function extractJsonPayload(rawContent: string) {
  const fencedMatch = rawContent.match(/```json\s*([\s\S]*?)```/i) || rawContent.match(/```\s*([\s\S]*?)```/i)
  return fencedMatch ? fencedMatch[1].trim() : rawContent.trim()
}

export async function requestAiJson<T>({
  systemPrompt,
  userPrompt,
  temperature = 0.4,
}: AiJsonRequest): Promise<T> {
  const { apiKey, model, baseUrl } = getAiConfig()

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  const payload = await response.json() as AiChatCompletionResponse

  if (!response.ok) {
    const message = payload.error?.message || 'AI request failed'
    throw new Error(message)
  }

  const content = payload.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('AI returned empty content')
  }

  try {
    return JSON.parse(extractJsonPayload(content)) as T
  } catch {
    throw new Error('AI returned invalid JSON')
  }
}

export function hasAiConfig() {
  const provider = (process.env.AI_PROVIDER as AiProvider | undefined) || 'deepseek'
  return provider === 'gemini'
    ? Boolean(process.env.GOOGLE_API_KEY)
    : Boolean(process.env.DEEPSEEK_API_KEY)
}



