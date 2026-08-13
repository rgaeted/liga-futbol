import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as Notifications from 'expo-notifications'
import NotificationOnboardingScreen from '../../app/(onboarding)/notifications'
import { completeOnboarding } from '../../src/storage/onboarding'

vi.mock('expo-router', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}))

vi.mock('../../src/storage/onboarding', () => ({
  completeOnboarding: vi.fn(async () => undefined),
}))

describe('notification onboarding', () => {
  it('continues when notifications are denied', async () => {
    vi.spyOn(Notifications, 'requestPermissionsAsync').mockResolvedValue({
      status: 'denied',
      expires: 'never',
      granted: false,
      canAskAgain: true,
    } as never)

    render(<NotificationOnboardingScreen />)
    fireEvent.click(screen.getByText('Continuar'))

    await waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalled()
    })
  })
})
