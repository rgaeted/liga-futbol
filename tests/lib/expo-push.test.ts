import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendExpoPush, type ExpoPushMessage } from '@/lib/mobile/notifications/expo-push'

function buildMessages(count: number): ExpoPushMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    to: `ExpoPushToken[${index}]`,
    title: '¡Gol!',
    body: `Mensaje ${index}`,
    data: { type: 'match', matchId: 'm1' },
  }))
}

describe('sendExpoPush', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockClear()
    delete process.env.EXPO_ACCESS_TOKEN
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends messages in chunks of 100', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: Array.from({ length: 100 }, () => ({ status: 'ok', id: 'ticket-1' })),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ status: 'ok', id: 'ticket-2' }] }),
      })

    const tickets = await sendExpoPush(buildMessages(101))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toHaveLength(100)
    expect(JSON.parse(String(fetchMock.mock.calls[1][1].body))).toHaveLength(1)
    expect(tickets).toHaveLength(101)
  })

  it('includes Authorization only when EXPO_ACCESS_TOKEN is set', async () => {
    process.env.EXPO_ACCESS_TOKEN = 'expo-secret'
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok', id: 'ticket-1' }] }),
    })

    await sendExpoPush(buildMessages(1))

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer expo-secret')
  })

  it('omits Authorization without EXPO_ACCESS_TOKEN', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok', id: 'ticket-1' }] }),
    })

    await sendExpoPush(buildMessages(1))

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  it('uses default sound and high priority', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok', id: 'ticket-1' }] }),
    })

    await sendExpoPush(buildMessages(1))

    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))[0]).toMatchObject({
      sound: 'default',
      priority: 'high',
    })
  })

  it('parses ok and DeviceNotRegistered tickets', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { status: 'ok', id: 'ticket-ok' },
          {
            status: 'error',
            message: 'DeviceNotRegistered',
            details: { error: 'DeviceNotRegistered' },
          },
        ],
      }),
    })

    const tickets = await sendExpoPush(buildMessages(2))

    expect(tickets[0]).toMatchObject({ status: 'ok', id: 'ticket-ok' })
    expect(tickets[1]).toMatchObject({
      status: 'error',
      details: { error: 'DeviceNotRegistered' },
    })
  })

  it('throws on transient HTTP failures', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    })

    await expect(sendExpoPush(buildMessages(1))).rejects.toThrow('Expo push HTTP 503')
  })
})
