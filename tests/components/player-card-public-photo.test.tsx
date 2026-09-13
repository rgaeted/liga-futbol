// @vitest-environment jsdom

import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { PlayerCardPhoto } from '@/components/player-card/PlayerCardPhoto'
import { PlayerCardOgImage } from '@/components/player-card/PlayerCardOgImage'
import type { PlayerCardDto } from '@/lib/player-card-query'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

const PUBLIC_PLAYER_CARD_ROOTS = [
  'src/components/player-card/PlayerCard.tsx',
  'src/components/player-card/PlayerCardPhoto.tsx',
  'src/components/player-card/PlayerCardOgImage.tsx',
  'src/lib/player-card-query.ts',
  'src/app/(tenant)/[organizationSlug]/jugador/[playerId]/og/route.tsx',
]

function resolveLocalModule(fromFile: string, specifier: string): string | null {
  const base = specifier.startsWith('@/')
    ? resolve(process.cwd(), 'src', specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(fromFile), specifier)
      : null
  if (!base) return null

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.tsx'),
    resolve(base, 'index.js'),
    resolve(base, 'index.jsx'),
  ]
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

function staticImports(file: string): string[] {
  const contents = readFileSync(file, 'utf8')
  const parsed = ts.createSourceFile(
    file,
    contents,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const imports: string[] = []

  parsed.forEachChild((node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text)
    }
  })
  return imports
}

function publicPlayerCardImportGraph() {
  const forbidden = [
    '@imgly/background-removal',
    'onnxruntime-web',
    'player-card-photo-process',
  ]
  const pending = PUBLIC_PLAYER_CARD_ROOTS.map((root) => resolve(process.cwd(), root))
  const visited = new Set<string>()
  const violations: string[] = []

  while (pending.length > 0) {
    const file = pending.pop()!
    if (visited.has(file)) continue
    visited.add(file)

    for (const specifier of staticImports(file)) {
      if (forbidden.some((entry) => specifier.includes(entry))) {
        violations.push(`${relative(process.cwd(), file)} -> ${specifier}`)
      }
      const dependency = resolveLocalModule(file, specifier)
      if (dependency && !visited.has(dependency)) pending.push(dependency)
    }
  }

  return { visited, violations }
}

function card(fotoEsRecorte: boolean): PlayerCardDto {
  return {
    player: {
      id: 'p1',
      nombre: 'Fernando Opitz',
      nombreCorto: 'F. Opitz',
      posicion: 'DEL',
      equipo: 'Blancos',
      fotoUrl: '/api/players/p1/card-photo?v=1',
      fotoEsRecorte,
      escudoUrl: '/branding/loslunes-logo.png',
      premio: null,
    },
    ventana: {
      dias: 30,
      desde: '2026-08-14',
      hasta: '2026-09-13',
      fechasPosibles: 5,
      pj: 3,
      minPj: 2,
    },
    crudos: {
      goles: 2,
      asistencias: 1,
      presencias: 3,
      mvps: 0,
      amarillas: 0,
      rojas: 0,
      rachaGoleadora: 1,
      rachaPresencia: 3,
    },
    atributos: { TIR: 80, VIS: 74, RES: 79, REG: 68, RIT: 70, FIS: 66 },
    ovr: 75,
    estado: 'completa',
    partidosFaltantes: 0,
  }
}

describe('public player card photo', () => {
  it('renders a persisted derivative as a bottom-aligned contained subject', () => {
    const html = renderToStaticMarkup(
      <PlayerCardPhoto
        fotoUrl="/api/players/p1/card-photo?v=1"
        fotoEsRecorte
        alt="Foto de Fernando Opitz"
        initials="FO"
        variant="shield"
      />,
    )

    expect(html).toContain('alt="Foto de Fernando Opitz"')
    expect(html).toContain('object-contain')
    expect(html).toContain('object-bottom')
    expect(html).toContain('max-h-full')
    expect(html).toContain('max-w-full')
    expect(html).not.toContain('mask-image')
  })

  it('renders the original fallback with cover and a soft bottom mask', () => {
    const html = renderToStaticMarkup(
      <PlayerCardPhoto
        fotoUrl="/api/players/p1/card-photo"
        fotoEsRecorte={false}
        alt="Foto de Fernando Opitz"
        initials="FO"
        variant="shield"
      />,
    )

    expect(html).toContain('object-cover')
    expect(html).toContain('mask-image')
  })

  it('retries image loading when the photo URL changes after an error', async () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    const props = {
      fotoEsRecorte: true,
      alt: 'Foto de Fernando Opitz',
      initials: 'FO',
      variant: 'shield' as const,
    }

    await act(async () => {
      root.render(<PlayerCardPhoto {...props} fotoUrl="/card-photo?v=1" />)
    })
    await act(async () => {
      container.querySelector('img')?.dispatchEvent(new Event('error'))
    })
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('FO')

    await act(async () => {
      root.render(<PlayerCardPhoto {...props} fotoUrl="/card-photo?v=2" />)
    })
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/card-photo?v=2',
    )

    await act(async () => root.unmount())
  })

  it('has no forbidden inference dependency in its recursive public import graph', () => {
    const graph = publicPlayerCardImportGraph()

    expect(graph.violations).toEqual([])
    for (const root of PUBLIC_PLAYER_CARD_ROOTS) {
      expect(graph.visited).toContain(resolve(process.cwd(), root))
    }
  })

  it('removes the legacy public cutout helper', () => {
    expect(
      existsSync(resolve(process.cwd(), 'src/lib/player-card-photo-cutout.ts')),
    ).toBe(false)
  })

  it('passes the persisted derivative flag through the web composition', () => {
    expect(source('src/components/player-card/PlayerCard.tsx')).toContain(
      'fotoEsRecorte={player.fotoEsRecorte}',
    )
  })
})

describe('player card OG photo', () => {
  it('uses contain and bottom alignment for the persisted derivative', () => {
    const html = renderToStaticMarkup(
      <PlayerCardOgImage
        card={card(true)}
        fotoUrl="https://ligalab.cl/api/players/p1/card-photo?v=1"
        escudoUrl="https://ligalab.cl/branding/loslunes-logo.png"
      />,
    )

    expect(html).toContain(
      'src="https://ligalab.cl/api/players/p1/card-photo?v=1"',
    )
    expect(html).toContain('object-fit:contain')
    expect(html).toContain('object-position:center bottom')
  })

  it('uses cover and a top-biased position for the original fallback', () => {
    const html = renderToStaticMarkup(
      <PlayerCardOgImage
        card={card(false)}
        fotoUrl="https://ligalab.cl/api/players/p1/card-photo"
        escudoUrl="https://ligalab.cl/branding/loslunes-logo.png"
      />,
    )

    expect(html).toContain('object-fit:cover')
    expect(html).toContain('object-position:center 10%')
  })

  it('feeds the OG component the absolute URL from the card payload', () => {
    const routeSource = source(
      'src/app/(tenant)/[organizationSlug]/jugador/[playerId]/og/route.tsx',
    )

    expect(routeSource).toContain('fotoUrl={absUrl(origin, player.fotoUrl)}')
    expect(source('src/components/player-card/PlayerCardOgImage.tsx')).toContain(
      'player.fotoEsRecorte',
    )
  })
})
