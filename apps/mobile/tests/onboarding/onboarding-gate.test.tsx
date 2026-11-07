import { act, renderHook, waitFor, cleanup } from '@testing-library/react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useOnboardingGate } from '../../src/hooks/useOnboardingGate'
import { completeOnboarding, resetOnboarding } from '../../src/storage/onboarding'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('onboarding navigation state', () => {
  it('updates the mounted gate when onboarding is completed and reset', async () => {
    const { result } = renderHook(() => useOnboardingGate())
    await waitFor(() => expect(result.current.completed).toBe(false))
    await act(() => completeOnboarding())
    expect(result.current.completed).toBe(true)
    await act(() => resetOnboarding())
    expect(result.current.completed).toBe(false)
  })

  it('does not overwrite completion with a stale initial storage read', async () => {
    let resolveRead!: (value: string | null) => void
    vi.mocked(AsyncStorage.getItem).mockImplementationOnce(() => new Promise((resolve) => {
      resolveRead = resolve
    }))
    const { result } = renderHook(() => useOnboardingGate())
    await act(() => completeOnboarding())
    await act(async () => resolveRead(null))
    expect(result.current.ready).toBe(true)
    expect(result.current.completed).toBe(true)
  })
})
