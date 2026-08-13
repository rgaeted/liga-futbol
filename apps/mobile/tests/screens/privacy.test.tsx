import { fireEvent, render, screen } from '@testing-library/react'
import * as WebBrowser from 'expo-web-browser'
import { describe, expect, it, vi } from 'vitest'
import PrivacyScreen from '../../app/(tabs)/more/privacy'
import { MOBILE_APP_PRIVACY_URL } from '../../src/lib/privacy-content'

describe('PrivacyScreen', () => {
  it('shows the in-app privacy summary and opens the HTTPS policy', () => {
    const openBrowser = vi.spyOn(WebBrowser, 'openBrowserAsync').mockResolvedValue({
      type: 'dismiss',
    } as never)

    render(<PrivacyScreen />)

    expect(screen.getByText(/No necesitas crear una cuenta/)).toBeTruthy()
    expect(screen.getByText(/identificador anónimo de instalación/)).toBeTruthy()
    expect(screen.getByText(/contenido público de la liga/)).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Abrir política de privacidad completa en el navegador'))
    expect(openBrowser).toHaveBeenCalledWith(MOBILE_APP_PRIVACY_URL)
  })
})
