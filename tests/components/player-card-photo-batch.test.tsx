// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlayerCardPhotoBatchProcessor } from '@/components/admin/PlayerCardPhotoBatchProcessor'
import { FriendlyPlayersTable } from '@/components/admin/FriendlyPlayersTable'

const processor = vi.hoisted(() => ({
  processPlayerCardPhoto: vi.fn(),
}))

const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
}))

const editor = vi.hoisted(() => ({
  sources: [] as Blob[],
  sourceEtags: [] as string[],
}))

vi.mock('@/lib/player-card-photo-process', () => ({
  processPlayerCardPhoto: processor.processPlayerCardPhoto,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}))

vi.mock('@/components/admin/PlayerCardPhotoEditorDialog', () => ({
  PlayerCardPhotoEditorDialog: ({
    playerName,
    source,
    sourceEtag,
    onSaved,
  }: {
    playerName: string
    source: Blob
    sourceEtag: string
    onSaved: () => void
  }) => {
    editor.sources.push(source)
    editor.sourceEtags.push(sourceEtag)
    return (
      <div role="dialog">
        Corrigiendo {playerName}
        <button type="button" onClick={onSaved}>
          Guardar manualmente
        </button>
      </div>
    )
  },
}))

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

type Player = {
  id: string
  name: string
  hasPhoto: boolean
  hasCardPhoto: boolean
  photoVersion: string
}

const eligiblePlayers: Player[] = [
  {
    id: 'p1',
    name: 'Rodrigo Olave',
    hasPhoto: true,
    hasCardPhoto: false,
    photoVersion: 'v1',
  },
  {
    id: 'p2',
    name: 'Fernando Opitz',
    hasPhoto: true,
    hasCardPhoto: false,
    photoVersion: 'v1',
  },
]

let root: Root | null = null
let fetchMock: ReturnType<typeof vi.fn>

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function originalResponse(id: string) {
  return new Response(new Blob([`original-${id}`], { type: 'image/jpeg' }), {
    status: 200,
    headers: {
      'content-type': 'image/jpeg',
      etag: `"source-${id}"`,
    },
  })
}

function successfulFetch(url: string) {
  if (url.endsWith('/photo')) {
    return Promise.resolve(originalResponse(url.split('/').at(-2) ?? 'unknown'))
  }
  return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
}

async function renderElement(element: React.ReactNode) {
  const container = document.body.appendChild(document.createElement('div'))
  root = createRoot(container)
  await act(async () => {
    root?.render(element)
  })
}

async function render(players: Player[] = eligiblePlayers) {
  await renderElement(<PlayerCardPhotoBatchProcessor players={players} />)
}

async function rerender(players: Player[]) {
  await act(async () => {
    root?.render(<PlayerCardPhotoBatchProcessor players={players} />)
  })
}

async function flushUpdates() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

function button(name: string | RegExp) {
  const candidates = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
  const match = candidates.find((candidate) =>
    typeof name === 'string'
      ? candidate.textContent?.trim() === name
      : name.test(candidate.textContent?.trim() ?? ''),
  )
  if (!match) throw new Error(`No se encontró el botón ${String(name)}`)
  return match
}

function postUrls() {
  return fetchMock.mock.calls
    .filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')
    .map(([url]) => url)
}

beforeEach(() => {
  fetchMock = vi.fn(successfulFetch)
  globalThis.fetch = fetchMock as typeof fetch
  processor.processPlayerCardPhoto.mockReset()
  processor.processPlayerCardPhoto.mockResolvedValue(
    new Blob(['processed'], { type: 'image/png' }),
  )
  navigation.refresh.mockReset()
  editor.sources.length = 0
  editor.sourceEtags.length = 0
})

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount())
    root = null
  }
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('PlayerCardPhotoBatchProcessor', () => {
  it('omite jugadores sin original o con recorte persistido', async () => {
    await render([
      eligiblePlayers[0]!,
      {
        id: 'p2',
        name: 'Ya listo',
        hasPhoto: true,
        hasCardPhoto: true,
        photoVersion: 'v1',
      },
      {
        id: 'p3',
        name: 'Sin foto',
        hasPhoto: false,
        hasCardPhoto: false,
        photoVersion: 'v1',
      },
    ])

    await act(async () => {
      button('Preparar fotos para cartas').click()
    })
    await flushUpdates()

    expect(document.body.textContent).toContain('1 de 1')
    expect(processor.processPlayerCardPhoto).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/players/p1/photo',
      expect.objectContaining({
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      }),
    )
    expect(postUrls()).toEqual(['/api/players/p1/card-photo'])
    const post = fetchMock.mock.calls.find(
      ([url]) => url === '/api/players/p1/card-photo',
    )
    const photo = (post?.[1] as RequestInit).body as FormData
    expect((photo.get('photo') as File).type).toBe('image/png')
    expect((post?.[1] as RequestInit).headers).toEqual({
      'If-Match': '"source-p1"',
      'If-None-Match': '*',
    })
  })

  it('solicita create-only y cuenta un recorte omitido como éxito', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/photo')) return Promise.resolve(originalResponse('p1'))
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
        }),
      )
    })
    await render([eligiblePlayers[0]!])

    await act(async () => {
      button('Preparar fotos para cartas').click()
    })
    await flushUpdates()

    const post = fetchMock.mock.calls.find(
      ([url]) => url === '/api/players/p1/card-photo',
    )
    expect((post?.[1] as RequestInit).headers).toEqual({
      'If-Match': '"source-p1"',
      'If-None-Match': '*',
    })
    expect(document.body.textContent).toContain('1 de 1')
    expect(button('Preparar fotos para cartas').disabled).toBe(true)
    expect(document.body.textContent).not.toContain('Fotos con errores')
    expect(navigation.refresh).toHaveBeenCalledTimes(1)
  })

  it('procesa estrictamente en secuencia y bloquea inicios superpuestos', async () => {
    const first = deferred<Blob>()
    const second = deferred<Blob>()
    let inFlight = 0
    let maxInFlight = 0
    processor.processPlayerCardPhoto
      .mockImplementationOnce(async () => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        const result = await first.promise
        inFlight -= 1
        return result
      })
      .mockImplementationOnce(async () => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        const result = await second.promise
        inFlight -= 1
        return result
      })
    await render()

    act(() => {
      button('Preparar fotos para cartas').click()
      button(/Preparar fotos para cartas|Procesando/).click()
    })
    await flushUpdates()
    expect(processor.processPlayerCardPhoto).toHaveBeenCalledTimes(1)

    await act(async () => {
      first.resolve(new Blob(['p1'], { type: 'image/png' }))
      await first.promise
    })
    await flushUpdates()
    expect(processor.processPlayerCardPhoto).toHaveBeenCalledTimes(2)
    expect(maxInFlight).toBe(1)

    await act(async () => {
      second.resolve(new Blob(['p2'], { type: 'image/png' }))
      await second.promise
    })
    await flushUpdates()
    expect(postUrls()).toEqual([
      '/api/players/p1/card-photo',
      '/api/players/p2/card-photo',
    ])
  })

  it('continúa con el jugador siguiente después de un error', async () => {
    processor.processPlayerCardPhoto
      .mockRejectedValueOnce(new Error('sin sujeto'))
      .mockResolvedValueOnce(new Blob(['p2'], { type: 'image/png' }))
    await render()

    await act(async () => {
      button('Preparar fotos para cartas').click()
    })
    await flushUpdates()

    expect(processor.processPlayerCardPhoto).toHaveBeenCalledTimes(2)
    expect(postUrls()).toEqual(['/api/players/p2/card-photo'])
    expect(document.body.textContent).toContain('Rodrigo Olave')
    expect(document.body.textContent).toContain(
      'No pudimos procesar el recorte automáticamente.',
    )
    expect(button('Corregir recorte')).toBeTruthy()
  })

  it('muestra el mensaje específico entregado por el procesador', async () => {
    const processorMessage =
      'Se detectó más de una persona. Usa una foto individual.'
    processor.processPlayerCardPhoto.mockRejectedValueOnce(
      new Error(processorMessage),
    )
    await render([eligiblePlayers[0]!])

    await act(async () => {
      button('Preparar fotos para cartas').click()
    })
    await flushUpdates()

    expect(document.body.textContent).toContain(processorMessage)
  })

  it('pausa entre jugadores y continúa desde el siguiente', async () => {
    const first = deferred<Blob>()
    processor.processPlayerCardPhoto
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(new Blob(['p2'], { type: 'image/png' }))
    await render()

    act(() => button('Preparar fotos para cartas').click())
    await flushUpdates()
    act(() => button('Pausar').click())
    await act(async () => {
      first.resolve(new Blob(['p1'], { type: 'image/png' }))
      await first.promise
    })
    await flushUpdates()

    expect(processor.processPlayerCardPhoto).toHaveBeenCalledTimes(1)
    expect(document.body.textContent).toContain('1 de 2')

    await act(async () => {
      button('Continuar').click()
    })
    await flushUpdates()
    expect(processor.processPlayerCardPhoto).toHaveBeenCalledTimes(2)
    expect(document.body.textContent).toContain('2 de 2')
  })

  it('conserva la cola pausada antes de permitir reintentar errores', async () => {
    const first = deferred<Blob>()
    processor.processPlayerCardPhoto
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(new Blob(['p2'], { type: 'image/png' }))
      .mockResolvedValueOnce(new Blob(['p1-retry'], { type: 'image/png' }))
    await render()

    act(() => button('Preparar fotos para cartas').click())
    await flushUpdates()
    act(() => button('Pausar').click())
    await act(async () => {
      first.reject(new Error('sin sujeto'))
      await first.promise.catch(() => undefined)
    })
    await flushUpdates()

    expect(button('Reintentar errores').disabled).toBe(true)
    await act(async () => {
      button('Continuar').click()
    })
    await flushUpdates()
    expect(postUrls()).toEqual(['/api/players/p2/card-photo'])

    await act(async () => {
      button('Reintentar errores').click()
    })
    await flushUpdates()
    expect(postUrls()).toEqual([
      '/api/players/p2/card-photo',
      '/api/players/p1/card-photo',
    ])
  })

  it('vuelve a descargar el original para reintentar un error de proceso', async () => {
    processor.processPlayerCardPhoto
      .mockRejectedValueOnce(new Error('sin sujeto'))
      .mockResolvedValueOnce(new Blob(['p2'], { type: 'image/png' }))
      .mockResolvedValueOnce(new Blob(['p1-retry'], { type: 'image/png' }))
    await render()

    await act(async () => {
      button('Preparar fotos para cartas').click()
    })
    await flushUpdates()
    await act(async () => {
      button('Reintentar errores').click()
    })
    await flushUpdates()

    expect(processor.processPlayerCardPhoto).toHaveBeenCalledTimes(3)
    expect(
      fetchMock.mock.calls.filter(([url]) => url === '/api/players/p1/photo'),
    ).toHaveLength(2)
    expect(postUrls()).toContain('/api/players/p1/card-photo')
    expect(document.body.textContent).not.toContain('No se pudo preparar')
  })

  it('reintenta un fallo de guardado sin repetir descarga ni inferencia', async () => {
    let saveAttempts = 0
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/photo')) return Promise.resolve(originalResponse('p1'))
      saveAttempts += 1
      return Promise.resolve(
        new Response(JSON.stringify({ ok: saveAttempts > 1 }), {
          status: saveAttempts > 1 ? 200 : 500,
        }),
      )
    })
    await render([eligiblePlayers[0]!])

    await act(async () => {
      button('Preparar fotos para cartas').click()
    })
    await flushUpdates()
    expect(document.body.textContent).toContain(
      'El recorte quedó listo, pero no pudimos guardarlo.',
    )
    await act(async () => {
      button('Reintentar errores').click()
    })
    await flushUpdates()

    expect(processor.processPlayerCardPhoto).toHaveBeenCalledTimes(1)
    expect(
      fetchMock.mock.calls.filter(([url]) => url === '/api/players/p1/photo'),
    ).toHaveLength(1)
    expect(postUrls()).toHaveLength(2)
  })

  it('descarga el original vigente al corregir manualmente un fallo de guardado', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/photo')) return Promise.resolve(originalResponse('p1'))
      return Promise.resolve(new Response(null, { status: 500 }))
    })
    await render([eligiblePlayers[0]!])

    await act(async () => {
      button('Preparar fotos para cartas').click()
    })
    await flushUpdates()
    await act(async () => {
      button('Corregir recorte').click()
    })
    await flushUpdates()

    expect(
      fetchMock.mock.calls.filter(([url]) => url === '/api/players/p1/photo'),
    ).toHaveLength(2)
    expect(editor.sourceEtags).toEqual(['"source-p1"'])
  })

  it('refresca y reprocesa la fuente después de un 412', async () => {
    let saveAttempts = 0
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/photo')) return Promise.resolve(originalResponse('p1'))
      saveAttempts += 1
      return Promise.resolve(
        new Response(JSON.stringify({ ok: saveAttempts > 1 }), {
          status: saveAttempts > 1 ? 200 : 412,
        }),
      )
    })
    await render([eligiblePlayers[0]!])

    await act(async () => {
      button('Preparar fotos para cartas').click()
    })
    await flushUpdates()
    expect(document.body.textContent).toContain(
      'La foto original cambió. Vuelve a preparar el recorte.',
    )

    await act(async () => {
      button('Reintentar errores').click()
    })
    await flushUpdates()

    expect(processor.processPlayerCardPhoto).toHaveBeenCalledTimes(2)
    expect(
      fetchMock.mock.calls.filter(([url]) => url === '/api/players/p1/photo'),
    ).toHaveLength(2)
  })

  it('reconcilia reemplazos y fotos nuevas por versión cuando queda inactivo', async () => {
    await render([eligiblePlayers[0]!])
    await act(async () => {
      button('Preparar fotos para cartas').click()
    })
    await flushUpdates()

    await rerender([
      { ...eligiblePlayers[0]!, photoVersion: 'v2' },
      { ...eligiblePlayers[1]!, photoVersion: 'v1' },
    ])
    await flushUpdates()

    expect(button('Preparar fotos para cartas').disabled).toBe(false)
    await act(async () => {
      button('Preparar fotos para cartas').click()
    })
    await flushUpdates()

    expect(processor.processPlayerCardPhoto).toHaveBeenCalledTimes(3)
    expect(document.body.textContent).toContain('2 de 2')
    expect(document.body.textContent).not.toContain('3 de 2')
  })

  it('descarta el error de una versión reemplazada durante la inferencia', async () => {
    const processing = deferred<Blob>()
    processor.processPlayerCardPhoto.mockReturnValue(processing.promise)
    await render([eligiblePlayers[0]!])

    act(() => button('Preparar fotos para cartas').click())
    await flushUpdates()
    await rerender([{ ...eligiblePlayers[0]!, photoVersion: 'v2' }])
    await act(async () => {
      processing.reject(new Error('falló la versión antigua'))
      await processing.promise.catch(() => undefined)
    })
    await flushUpdates()

    expect(document.body.textContent).not.toContain('Fotos con errores')
    expect(button('Preparar fotos para cartas').disabled).toBe(false)
  })

  it('anuncia errores y etiqueta acciones por jugador', async () => {
    processor.processPlayerCardPhoto.mockRejectedValueOnce(new Error('sin sujeto'))
    await render([eligiblePlayers[0]!])

    await act(async () => {
      button('Preparar fotos para cartas').click()
    })
    await flushUpdates()

    const alert = document.querySelector('[role="alert"]')
    expect(alert?.getAttribute('aria-live')).toBe('assertive')
    expect(
      document.querySelector(
        'button[aria-label="Corregir recorte de Rodrigo Olave"]',
      ),
    ).not.toBeNull()
  })

  it('abre la corrección manual con el original y limpia el error al guardar', async () => {
    processor.processPlayerCardPhoto.mockRejectedValueOnce(new Error('sin sujeto'))
    await render([eligiblePlayers[0]!])

    await act(async () => {
      button('Preparar fotos para cartas').click()
    })
    await flushUpdates()
    act(() => button('Corregir recorte').click())
    await flushUpdates()

    expect(document.body.textContent).toContain('Corrigiendo Rodrigo Olave')
    expect(editor.sources).toHaveLength(1)
    expect(editor.sourceEtags).toEqual(['"source-p1"'])
    expect(
      fetchMock.mock.calls.filter(([url]) => url === '/api/players/p1/photo'),
    ).toHaveLength(2)

    act(() => button('Guardar manualmente').click())
    await flushUpdates()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.body.textContent).not.toContain('No se pudo preparar')
    expect(navigation.refresh).toHaveBeenCalled()
  })

  it('vuelve a descargar el original para corregir si el GET inicial falló', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(originalResponse('p1'))
    await render([eligiblePlayers[0]!])

    await act(async () => {
      button('Preparar fotos para cartas').click()
    })
    await flushUpdates()
    expect(document.body.textContent).toContain(
      'No pudimos descargar la foto original.',
    )

    await act(async () => {
      button('Corregir recorte').click()
    })
    await flushUpdates()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(
      fetchMock.mock.calls.filter(([url]) => url === '/api/players/p1/photo'),
    ).toHaveLength(2)
    expect(editor.sourceEtags).toEqual(['"source-p1"'])
  })

  it('aborta o ignora el trabajo pendiente después de desmontar', async () => {
    const processing = deferred<Blob>()
    processor.processPlayerCardPhoto.mockReturnValue(processing.promise)
    await render([eligiblePlayers[0]!])

    act(() => button('Preparar fotos para cartas').click())
    await flushUpdates()
    await act(async () => root?.unmount())
    root = null
    const originalRequest = fetchMock.mock.calls.find(
      ([url]) => url === '/api/players/p1/photo',
    )
    expect(
      ((originalRequest?.[1] as RequestInit).signal as AbortSignal).aborted,
    ).toBe(true)
    await act(async () => {
      processing.resolve(new Blob(['late'], { type: 'image/png' }))
      await processing.promise
    })

    expect(postUrls()).toEqual([])
    expect(navigation.refresh).not.toHaveBeenCalled()
  })

  it('aborta una descarga que sigue en vuelo al desmontar', async () => {
    const download = deferred<Response>()
    fetchMock.mockReturnValue(download.promise)
    await render([eligiblePlayers[0]!])

    act(() => button('Preparar fotos para cartas').click())
    await flushUpdates()
    const signal = (fetchMock.mock.calls[0]?.[1] as RequestInit)
      .signal as AbortSignal

    await act(async () => root?.unmount())
    root = null
    expect(signal.aborted).toBe(true)

    await act(async () => {
      download.resolve(originalResponse('p1'))
      await download.promise
    })
    expect(processor.processPlayerCardPhoto).not.toHaveBeenCalled()
  })
})

describe('FriendlyPlayersTable card photo batch', () => {
  const row = {
    id: 'p1',
    personId: 'person-1',
    firstName: 'Rodrigo',
    lastName: 'Olave',
    email: 'rodrigo@example.com',
    hasAccount: true,
    registerPath: null,
    hasPhoto: true,
    hasCardPhoto: false,
    photoVersion: 'v1',
    dominantFoot: null,
    primaryPosition: null,
    secondaryPosition: null,
    categoryIds: [],
  }

  it('muestra el lote solo para el slug canónico de Los Lunes', async () => {
    await renderElement(
      <FriendlyPlayersTable
        organizationSlug="loslunes"
        players={[row]}
        batchPlayers={[row]}
        categories={[]}
        mergeOptions={[]}
      />,
    )
    expect(document.body.textContent).toContain('Fotos para cartas')

    await act(async () => root?.unmount())
    root = null
    document.body.innerHTML = ''
    await renderElement(
      <FriendlyPlayersTable
        organizationSlug="kelme"
        players={[row]}
        batchPlayers={[row]}
        categories={[]}
        mergeOptions={[]}
      />,
    )
    expect(document.body.textContent).not.toContain('Fotos para cartas')
  })

  it('alimenta el lote con todos los jugadores aunque la tabla esté filtrada', async () => {
    await renderElement(
      <FriendlyPlayersTable
        organizationSlug="loslunes"
        players={[]}
        batchPlayers={[row]}
        categories={[]}
        mergeOptions={[]}
      />,
    )

    expect(button('Preparar fotos para cartas').disabled).toBe(false)
    expect(document.body.textContent).toContain('0 de 1')
  })
})

describe('AdminPlayersPage batch query', () => {
  it('selecciona solo metadatos y entrega un lote independiente del filtro', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'src/app/(tenant)/[organizationSlug]/(dashboard)/admin/players/page.tsx',
      ),
      'utf8',
    )
    const playerQuery = source.slice(
      source.indexOf('db.player.findMany'),
      source.indexOf('db.friendlyCategory.findMany'),
    )

    expect(playerQuery).toContain('select:')
    expect(playerQuery).not.toContain('include:')
    expect(playerQuery).not.toContain('photoData')
    expect(playerQuery).not.toContain('cardPhotoData')
    expect(playerQuery).toContain('updatedAt: true')
    expect(playerQuery).toContain('cardPhotoUpdatedAt: true')
    expect(source).toContain('photoVersion:')
    expect(source).toContain('batchPlayers={rows}')
  })
})
