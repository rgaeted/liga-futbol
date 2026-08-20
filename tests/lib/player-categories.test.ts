import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(),
  },
}))

import { setPlayerCategories } from '@/lib/player-categories'
import { db } from '@/lib/db'

describe('setPlayerCategories', () => {
  it('replaces category set', async () => {
    const tx = {
      playerCategory: { deleteMany: vi.fn(), createMany: vi.fn() },
    }
    vi.mocked(db.$transaction).mockImplementation(async (fn) => fn(tx as never))
    await setPlayerCategories('player-1', ['cat-1', 'cat-2'])
    expect(tx.playerCategory.deleteMany).toHaveBeenCalledWith({ where: { playerId: 'player-1' } })
    expect(tx.playerCategory.createMany).toHaveBeenCalled()
  })
})
