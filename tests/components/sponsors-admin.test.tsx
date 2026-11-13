// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ organizationSlug: 'kelme' }),
}))

import { SponsorForm, SponsorsTable } from '@/components/admin/content/SponsorsTable'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const initial = {
  name: 'Ferretería X',
  websiteUrl: '',
  placement: 'HOME' as const,
  startsAt: '',
  endsAt: '',
  isActive: true,
  tier: 'MAIN' as const,
  showOnLanding: true,
  tagline: '10 % para jugadores',
  ctaLabel: 'Escríbenos',
  ctaUrl: 'https://wa.me/1',
}

const stats = { current: { views: 3, clicks: 1 }, previous: { views: 0, clicks: 0 } }
const row = (id: string, name: string, logoUrl: string | null) => ({
  id,
  name,
  placement: 'HOME',
  tier: 'OFFICIAL' as const,
  showOnLanding: true,
  isActive: true,
  startsAt: null,
  endsAt: null,
  stats,
  logoUrl,
})

describe('panel de auspiciadores', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const render = async (node: React.ReactNode) => {
    await act(async () => root.render(node))
  }

  it('al editar, el logo está dentro de la misma tarjeta que los datos del auspiciador', async () => {
    await render(<SponsorForm seasonId="s1" sponsorId="sp1" initial={initial} logoUrl="/l.png" />)
    expect(container.textContent).toContain('Editando: Ferretería X')
    expect(container.querySelectorAll('section')).toHaveLength(1)
    const card = container.querySelector('section')!
    expect(card.textContent).toContain('Logo del auspiciador')
    expect(card.querySelector('img')?.getAttribute('src')).toBe('/l.png')
    expect(card.querySelector('input[type="file"]')).not.toBeNull()
  })

  it('un auspiciador nuevo avisa que el logo se sube después de guardarlo', async () => {
    await render(<SponsorForm seasonId="s1" />)
    expect(container.textContent).toContain('Nuevo patrocinador')
    expect(container.textContent).toContain('Guarda el patrocinador para poder subir su logo')
    expect(container.querySelector('input[type="file"]')).toBeNull()
  })

  it('la lista muestra el logo de cada auspiciador, marca el que se edita y lleva al editor', async () => {
    await render(
      <SponsorsTable
        seasonId="s1"
        selectedId="b"
        sponsors={[row('a', 'Alfa', '/a.png'), row('b', 'Beta', null)]}
      />,
    )
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/a.png')
    const rows = [...container.querySelectorAll('tbody tr')]
    expect(rows[0].getAttribute('aria-current')).toBeNull()
    expect(rows[1].getAttribute('aria-current')).toBe('true')
    expect(rows[1].textContent).toContain('Beta')
    const links = [...container.querySelectorAll('a')].map((link) => link.getAttribute('href') ?? '')
    const editLink = links.find((href) => href.includes('edit=a'))!
    expect(editLink).toMatch(/#editor$/)
    expect(container.textContent).toContain('+ Nuevo patrocinador')
    expect(links.some((href) => href.endsWith('season=s1#editor'))).toBe(true)
  })
})
