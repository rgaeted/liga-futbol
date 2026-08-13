const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const BATCH_SIZE = 100

export type ExpoPushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default'
  priority?: 'high' | 'default' | 'normal'
}

export type ExpoPushTicket = {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: {
    error?: string
  }
}

type ExpoPushResponse = {
  data: ExpoPushTicket[]
}

function buildExpoHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  const accessToken = process.env.EXPO_ACCESS_TOKEN
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  return headers
}

function serializeMessage(message: ExpoPushMessage) {
  return {
    to: message.to,
    title: message.title,
    body: message.body,
    data: message.data,
    sound: message.sound ?? 'default',
    priority: message.priority ?? 'high',
  }
}

export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) {
    return []
  }

  const tickets: ExpoPushTicket[] = []
  const headers = buildExpoHeaders()

  for (let index = 0; index < messages.length; index += BATCH_SIZE) {
    const chunk = messages.slice(index, index + BATCH_SIZE)
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk.map(serializeMessage)),
    })

    if (!response.ok) {
      throw new Error(`Expo push HTTP ${response.status}`)
    }

    const payload = (await response.json()) as ExpoPushResponse
    tickets.push(...payload.data)
  }

  return tickets
}
