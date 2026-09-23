import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/auth/register/route'

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password') },
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn(), create: vi.fn() },
  },
}))

import { db } from '@/lib/db'

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.user.findUnique).mockResolvedValue(null)
    vi.mocked(db.user.create).mockResolvedValue({ id: 'user-1' } as never)
  })

  it('creates a free account without org membership', async () => {
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ana@demo.cl',
          name: 'Ana Soto',
          password: 'password123',
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(db.user.create).toHaveBeenCalledWith({
      data: {
        email: 'ana@demo.cl',
        name: 'Ana Soto',
        passwordHash: 'hashed-password',
      },
    })
  })

  it('rejects duplicate email', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'existing' } as never)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ana@demo.cl',
          name: 'Ana Soto',
          password: 'password123',
        }),
      }),
    )

    expect(response.status).toBe(400)
  })
})
