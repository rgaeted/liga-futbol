import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MOBILE_APP_PRIVACY_SECTIONS } from '@/lib/mobile/privacy-content'

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('mobile app privacy policy', () => {
  it('states anonymous use and collected data categories', () => {
    const copy = MOBILE_APP_PRIVACY_SECTIONS.map((section) => section.body).join(' ')

    expect(copy).toMatch(/No necesitas crear una cuenta/)
    expect(copy).toMatch(/identificador anónimo de instalación/)
    expect(copy).toMatch(/equipos favoritos/)
    expect(copy).toMatch(/token de notificaciones Expo/)
    expect(copy).toMatch(/revocar permisos de notificaciones/)
    expect(copy).toMatch(/desactivar la instalación/)
    expect(copy).toMatch(/contenido público de la liga/)
  })

  it('exposes a public page route wired to the shared content', () => {
    const page = read('src/app/privacidad/app/page.tsx')

    expect(page).toContain('MOBILE_APP_PRIVACY_SECTIONS')
    expect(page).toContain('Privacidad de la app móvil')
  })
})
