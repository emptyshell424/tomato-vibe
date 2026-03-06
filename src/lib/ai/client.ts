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

const PROVIDER_DEFAULT_MODEL: Record<AiProvider, string> = {
  deepseek: 'deepseek-chat',
  gemini: 'gemini-3-flash-preview',
  openai: 'gpt-4o-mini',
}

const PROVIDER_DEFAULT_BASE_URL: Record<AiProvider, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  openai: 'https://api.openai.com/v1',
}

const PROVIDER_API_KEY_ENV: Record<AiProvider, string> = {
  deepseek: 'DEEPSEEK_API_KEY',
  gemini: 'GOOGLE_API_KEY',
  openai: 'OPENAI_API_KEY',
}

function resolveProvider() {
  const raw = process.env.AI_PROVIDER
  if (raw === 'gemini' || raw === 'openai' || raw === 'deepseek') {
    return raw
  }
  return 'deepseek'
}

function getProviderApiKey(provider: AiProvider) {
  switch (provider) {
    case 'gemini':
      return process.env.GOOGLE_API_KEY
    case 'openai':
      return process.env.OPENAI_API_KEY
    default:
      return process.env.DEEPSEEK_API_KEY
  }
}

function getAiConfig() {
  const provider = resolveProvider()
  const model = process.env.AI_MODEL || PROVIDER_DEFAULT_MODEL[provider]
  const baseUrl = (process.env.AI_BASE_URL || PROVIDER_DEFAULT_BASE_URL[provider]).replace(/\/$/, '')
  const apiKey = getProviderApiKey(provider)

  if (!apiKey) {
    throw new Error(`${PROVIDER_API_KEY_ENV[provider]} is not configured`)
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
  const provider = resolveProvider()
  return Boolean(getProviderApiKey(provider))
}
