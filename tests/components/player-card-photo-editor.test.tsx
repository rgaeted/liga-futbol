// @vitest-environment jsdom

import { act, StrictMode, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlayerCardPhotoEditorDialog } from '@/components/admin/PlayerCardPhotoEditorDialog'
import { FriendlyPlayerPhotoUpload } from '@/components/admin/FriendlyPlayerPhotoUpload'

const processor = vi.hoisted(() => ({
  extractPlayerCutout: vi.fn(),
  composePlayerCardPhoto: vi.fn(),
}))

const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
}))

vi.mock('@/lib/player-card-photo-process', () => ({
  DEFAULT_CARD_PHOTO_ADJUSTMENTS: {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  },
  extractPlayerCutout: processor.extractPlayerCutout,
  composePlayerCardPhoto: processor.composePlayerCardPhoto,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}))

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let fetchMock: ReturnType<typeof vi.fn>
let createObjectURLMock: ReturnType<typeof vi.fn>
let revokeObjectURLMock: ReturnType<typeof vi.fn>
let objectUrlSequence = 0

function sourcePhoto() {
  return new File(['original'], 'jugador.jpg', { type: 'image/jpeg' })
}

function cutoutBlob() {
  return new Blob(['cutout'], { type: 'image/png' })
}

function previewBlob(label = 'preview') {
  return new Blob([label], { type: 'image/png' })
}

async function render(element: React.ReactNode) {
  const container = document.body.appendChild(document.createElement('div'))
  root = createRoot(container)
  await act(async () => {
    root?.render(element)
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

function labelledRange(labelText: string) {
  const label = Array.from(document.querySelectorAll('label')).find((candidate) =>
    candidate.textContent?.includes(labelText),
  )
  const input = label?.querySelector<HTMLInputElement>('input[type="range"]')
  if (!input) throw new Error(`No se encontró el control ${labelText}`)
  return input
}

function changeRange(labelText: string, value: string) {
  const input = labelledRange(labelText)
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set
  act(() => {
    valueSetter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

async function openReadyEditor(overrides?: {
  onClose?: () => void
  onSaved?: () => void
}) {
  processor.extractPlayerCutout.mockResolvedValue(cutoutBlob())
  processor.composePlayerCardPhoto.mockResolvedValue(previewBlob())
  await render(
    <PlayerCardPhotoEditorDialog
      playerId="player-1"
      playerName="Rodrigo Olave"
      source={sourcePhoto()}
      sourceEtag='"source-v1"'
      onClose={overrides?.onClose ?? vi.fn()}
      onSaved={overrides?.onSaved ?? vi.fn()}
    />,
  )
  await flushUpdates()
  expect(document.querySelector('img[alt="Recorte de Rodrigo Olave"]')).not.toBeNull()
}

beforeEach(() => {
  objectUrlSequence = 0
  fetchMock = vi.fn()
  globalThis.fetch = fetchMock as typeof fetch
  createObjectURLMock = vi.fn(() => `blob:preview-${++objectUrlSequence}`)
  revokeObjectURLMock = vi.fn()
  URL.createObjectURL = createObjectURLMock
  URL.revokeObjectURL = revokeObjectURLMock
  processor.extractPlayerCutout.mockReset()
  processor.composePlayerCardPhoto.mockReset()
  navigation.refresh.mockReset()
})

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount())
    root = null
  }
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('PlayerCardPhotoEditorDialog', () => {
  it('completa la apertura en StrictMode sin repetir la extracción', async () => {
    processor.extractPlayerCutout.mockResolvedValue(cutoutBlob())
    processor.composePlayerCardPhoto.mockResolvedValue(previewBlob())

    await render(
      <StrictMode>
        <PlayerCardPhotoEditorDialog
          playerId="player-1"
          playerName="Rodrigo Olave"
          source={sourcePhoto()}
          sourceEtag='"source-v1"'
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />
      </StrictMode>,
    )
    await flushUpdates()

    expect(processor.extractPlayerCutout).toHaveBeenCalledTimes(1)
    expect(document.querySelector('img[alt="Recorte de Rodrigo Olave"]')).not.toBeNull()
  })

  it('no duplica la composición inicial al superar el debounce sin tocar controles', async () => {
    vi.useFakeTimers()
    const initialComposition = deferred<Blob>()
    const duplicateComposition = deferred<Blob>()
    void duplicateComposition.promise.catch(() => undefined)
    processor.extractPlayerCutout.mockResolvedValue(cutoutBlob())
    processor.composePlayerCardPhoto
      .mockReturnValueOnce(initialComposition.promise)
      .mockReturnValueOnce(duplicateComposition.promise)

    await render(
      <PlayerCardPhotoEditorDialog
        playerId="player-1"
        playerName="Rodrigo Olave"
        source={sourcePhoto()}
        sourceEtag='"source-v1"'
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await flushUpdates()
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    await act(async () => {
      initialComposition.resolve(previewBlob('inicial válida'))
      await initialComposition.promise
    })
    await flushUpdates()
    duplicateComposition.reject(new Error('duplicado tardío'))
    await flushUpdates()

    expect(processor.composePlayerCardPhoto).toHaveBeenCalledTimes(1)
    expect(document.querySelector('img[alt="Recorte de Rodrigo Olave"]')).not.toBeNull()
    expect(document.body.textContent).not.toContain(
      'No pudimos preparar el recorte. Revisa la foto e inténtalo nuevamente.',
    )
    expect(button('Guardar recorte').disabled).toBe(false)
  })

  it('extrae una vez y solo recompone el último ajuste después del debounce', async () => {
    vi.useFakeTimers()
    await openReadyEditor()

    expect(processor.extractPlayerCutout).toHaveBeenCalledTimes(1)
    expect(processor.composePlayerCardPhoto).toHaveBeenCalledTimes(1)

    changeRange('Mover horizontalmente', '0.08')
    changeRange('Tamaño', '1.2')

    await act(async () => {
      vi.advanceTimersByTime(249)
    })
    expect(processor.composePlayerCardPhoto).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    await flushUpdates()

    expect(processor.extractPlayerCutout).toHaveBeenCalledTimes(1)
    expect(processor.composePlayerCardPhoto).toHaveBeenCalledTimes(2)
    expect(processor.composePlayerCardPhoto).toHaveBeenLastCalledWith(
      expect.any(Blob),
      { offsetX: 0.08, offsetY: 0, scale: 1.2 },
    )
  })

  it('bloquea el guardado inmediatamente mientras recompone un ajuste', async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await openReadyEditor()

    changeRange('Tamaño', '1.15')
    const saveButton = button('Guardar recorte')

    expect(saveButton.disabled).toBe(true)
    act(() => saveButton.click())
    expect(fetchMock).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(250)
    })
    await flushUpdates()
    expect(button('Guardar recorte').disabled).toBe(false)
  })

  it('restaura el blob vigente si el ajuste vuelve al último compuesto dentro del debounce', async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await openReadyEditor()

    changeRange('Tamaño', '1.15')
    expect(button('Guardar recorte').disabled).toBe(true)
    changeRange('Tamaño', '1')

    expect(button('Guardar recorte').disabled).toBe(false)
    await act(async () => {
      vi.advanceTimersByTime(250)
    })
    await flushUpdates()
    expect(processor.composePlayerCardPhoto).toHaveBeenCalledTimes(1)

    await act(async () => {
      button('Guardar recorte').click()
    })
    await flushUpdates()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('ignora un error inicial tardío después de una recomposición exitosa', async () => {
    vi.useFakeTimers()
    const initialComposition = deferred<Blob>()
    processor.extractPlayerCutout.mockResolvedValue(cutoutBlob())
    processor.composePlayerCardPhoto
      .mockReturnValueOnce(initialComposition.promise)
      .mockResolvedValueOnce(previewBlob('más reciente'))

    await render(
      <PlayerCardPhotoEditorDialog
        playerId="player-1"
        playerName="Rodrigo Olave"
        source={sourcePhoto()}
        sourceEtag='"source-v1"'
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await flushUpdates()
    changeRange('Mover horizontalmente', '0.1')
    await act(async () => {
      vi.advanceTimersByTime(250)
    })
    await flushUpdates()

    expect(document.querySelector('img[alt="Recorte de Rodrigo Olave"]')).not.toBeNull()
    expect(button('Guardar recorte').disabled).toBe(false)

    await act(async () => {
      initialComposition.reject(new Error('fallo inicial tardío'))
      await initialComposition.promise.catch(() => undefined)
    })
    await flushUpdates()

    expect(document.body.textContent).not.toContain(
      'No pudimos preparar el recorte. Revisa la foto e inténtalo nuevamente.',
    )
    expect(button('Guardar recorte').disabled).toBe(false)
  })

  it('guarda un File PNG por POST y avisa solo después del éxito', async () => {
    const onSaved = vi.fn()
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await openReadyEditor({ onSaved })

    await act(async () => {
      button('Guardar recorte').click()
    })
    await flushUpdates()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/players/player-1/card-photo')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'If-Match': '"source-v1"' })
    const photo = (init.body as FormData).get('photo')
    expect(photo).toBeInstanceOf(File)
    expect((photo as File).name).toBe('card-photo.png')
    expect((photo as File).type).toBe('image/png')
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('no avisa guardado si la respuesta llega después de desmontar', async () => {
    const saveRequest = deferred<Response>()
    const onSaved = vi.fn()
    fetchMock.mockReturnValue(saveRequest.promise)
    await openReadyEditor({ onSaved })

    await act(async () => {
      button('Guardar recorte').click()
    })
    await act(async () => root?.unmount())
    root = null
    await act(async () => {
      saveRequest.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      await saveRequest.promise
    })

    expect(onSaved).not.toHaveBeenCalled()
  })

  it('carga y reprocesa la fuente vigente después de un 412', async () => {
    const onSaved = vi.fn()
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 412 }))
      .mockResolvedValueOnce(
        new Response(new Blob(['latest-original'], { type: 'image/jpeg' }), {
          status: 200,
          headers: { etag: '"source-v2"' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      )
    await openReadyEditor({ onSaved })

    await act(async () => {
      button('Guardar recorte').click()
    })
    await flushUpdates()

    expect(fetchMock.mock.calls[1]).toEqual([
      '/api/players/player-1/photo',
      expect.objectContaining({
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      }),
    ])
    expect(processor.extractPlayerCutout).toHaveBeenCalledTimes(2)
    expect(processor.composePlayerCardPhoto).toHaveBeenCalledTimes(2)
    expect(document.body.textContent).toContain(
      'La foto original cambió. Revisa la nueva vista previa antes de guardar.',
    )
    expect(onSaved).not.toHaveBeenCalled()
    expect(button('Guardar recorte').disabled).toBe(false)

    await act(async () => {
      button('Guardar recorte').click()
    })
    await flushUpdates()
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/players/player-1/card-photo',
      expect.objectContaining({
        headers: { 'If-Match': '"source-v2"' },
      }),
    )
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('aborta la recarga por 412 y no reprocesa después de desmontar', async () => {
    const latestSource = deferred<Response>()
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 412 }))
      .mockReturnValueOnce(latestSource.promise)
    await openReadyEditor()

    await act(async () => {
      button('Guardar recorte').click()
    })
    await flushUpdates()
    const latestRequest = fetchMock.mock.calls[1] as [string, RequestInit]

    await act(async () => root?.unmount())
    root = null
    expect((latestRequest[1].signal as AbortSignal).aborted).toBe(true)
    await act(async () => {
      latestSource.resolve(
        new Response(new Blob(['late']), {
          status: 200,
          headers: { etag: '"source-v2"' },
        }),
      )
      await latestSource.promise
    })

    expect(processor.extractPlayerCutout).toHaveBeenCalledTimes(1)
  })

  it('permite reintentar la extracción después de un error', async () => {
    processor.extractPlayerCutout
      .mockRejectedValueOnce(new Error('falló'))
      .mockResolvedValueOnce(cutoutBlob())
    processor.composePlayerCardPhoto.mockResolvedValue(previewBlob())

    await render(
      <PlayerCardPhotoEditorDialog
        playerId="player-1"
        playerName="Rodrigo Olave"
        source={sourcePhoto()}
        sourceEtag='"source-v1"'
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await flushUpdates()

    expect(document.body.textContent).toContain(
      'No pudimos preparar el recorte. Revisa la foto e inténtalo nuevamente.',
    )

    await act(async () => {
      button('Reintentar').click()
    })
    await flushUpdates()

    expect(processor.extractPlayerCutout).toHaveBeenCalledTimes(2)
    expect(document.querySelector('img[alt="Recorte de Rodrigo Olave"]')).not.toBeNull()
  })

  it('muestra el mensaje específico entregado por el procesador', async () => {
    const processorMessage =
      'Se detectó más de una persona. Usa una foto individual.'
    processor.extractPlayerCutout.mockResolvedValue(cutoutBlob())
    processor.composePlayerCardPhoto.mockRejectedValue(
      new Error(processorMessage),
    )

    await render(
      <PlayerCardPhotoEditorDialog
        playerId="player-1"
        playerName="Rodrigo Olave"
        source={sourcePhoto()}
        sourceEtag='"source-v1"'
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await flushUpdates()

    expect(document.body.textContent).toContain(processorMessage)
  })

  it('conserva el blob y la vista previa cuando falla el guardado', async () => {
    fetchMock.mockRejectedValue(new TypeError('sin red'))
    await openReadyEditor()
    const preview = document.querySelector<HTMLImageElement>(
      'img[alt="Recorte de Rodrigo Olave"]',
    )
    const previewUrl = preview?.src

    await act(async () => {
      button('Guardar recorte').click()
    })
    await flushUpdates()

    expect(document.body.textContent).toContain(
      'No se pudo guardar el recorte. Tu vista previa sigue disponible.',
    )
    expect(
      document.querySelector<HTMLImageElement>('img[alt="Recorte de Rodrigo Olave"]')?.src,
    ).toBe(previewUrl)
    expect(button('Guardar recorte').disabled).toBe(false)

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await act(async () => {
      button('Guardar recorte').click()
    })
    await flushUpdates()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('revoca las vistas previas reemplazadas y la activa al desmontar', async () => {
    vi.useFakeTimers()
    processor.extractPlayerCutout.mockResolvedValue(cutoutBlob())
    processor.composePlayerCardPhoto
      .mockResolvedValueOnce(previewBlob('primera'))
      .mockResolvedValueOnce(previewBlob('segunda'))
    await openReadyEditor()

    changeRange('Mover verticalmente', '-0.1')
    await act(async () => {
      vi.advanceTimersByTime(250)
    })
    await flushUpdates()

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:preview-1')
    await act(async () => root?.unmount())
    root = null
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:preview-2')
  })

  it('expone un diálogo modal, toma foco y Escape lo cierra cuando no está guardando', async () => {
    const onClose = vi.fn()
    await openReadyEditor({ onClose })
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')

    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy()
    expect(document.activeElement).toBe(dialog)

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('mantiene Tab y Shift+Tab dentro de los controles del diálogo', async () => {
    await openReadyEditor()
    const closeButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Cerrar editor"]',
    )
    const saveButton = button('Guardar recorte')

    saveButton.focus()
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      )
    })
    expect(document.activeElement).toBe(closeButton)

    closeButton?.focus()
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
        }),
      )
    })
    expect(document.activeElement).toBe(saveButton)
  })

  it('devuelve el foco al elemento activo anterior cuando se cierra', async () => {
    const source = sourcePhoto()

    function DialogHarness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Abrir editor
          </button>
          {open ? (
            <PlayerCardPhotoEditorDialog
              playerId="player-1"
              playerName="Rodrigo Olave"
              source={source}
              sourceEtag='"source-v1"'
              onClose={() => setOpen(false)}
              onSaved={vi.fn()}
            />
          ) : null}
        </>
      )
    }

    processor.extractPlayerCutout.mockResolvedValue(cutoutBlob())
    processor.composePlayerCardPhoto.mockResolvedValue(previewBlob())
    await render(<DialogHarness />)
    const opener = button('Abrir editor')
    opener.focus()

    act(() => opener.click())
    await flushUpdates()
    expect(document.activeElement).not.toBe(opener)

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Cerrar editor"]')
        ?.click()
    })
    await flushUpdates()

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })
})

describe('FriendlyPlayerPhotoUpload', () => {
  it('abre el editor solo después de guardar la foto original', async () => {
    const originalUpload = deferred<Response>()
    fetchMock.mockReturnValueOnce(originalUpload.promise)
    processor.extractPlayerCutout.mockResolvedValue(cutoutBlob())
    processor.composePlayerCardPhoto.mockResolvedValue(previewBlob())
    await render(
      <FriendlyPlayerPhotoUpload
        playerId="player-1"
        firstName="Rodrigo"
        lastName="Olave"
        hasPhoto={false}
      />,
    )

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')
    const file = sourcePhoto()
    Object.defineProperty(input, 'files', { configurable: true, value: [file] })
    act(() => {
      input?.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await flushUpdates()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/players/player-1/photo',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    await act(async () => {
      originalUpload.resolve(
        new Response(
          JSON.stringify({ ok: true, sourceEtag: '"uploaded-source"' }),
          { status: 200 },
        ),
      )
      await originalUpload.promise
    })
    await flushUpdates()

    expect(navigation.refresh).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(processor.extractPlayerCutout).toHaveBeenCalledWith(file)

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    await act(async () => {
      button('Guardar recorte').click()
    })
    await flushUpdates()
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/players/player-1/card-photo',
      expect.objectContaining({
        headers: { 'If-Match': '"uploaded-source"' },
      }),
    )
  })

  it('muestra un alerta y restablece la carga si el upload rechaza la red', async () => {
    fetchMock.mockRejectedValue(new TypeError('sin red'))
    await render(
      <FriendlyPlayerPhotoUpload
        playerId="player-1"
        firstName="Rodrigo"
        lastName="Olave"
        hasPhoto={false}
      />,
    )

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [sourcePhoto()],
    })
    act(() => {
      input?.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await flushUpdates()

    const alert = document.querySelector('[role="alert"]')
    expect(alert?.textContent).toContain('No se pudo subir la foto')
    expect(alert?.getAttribute('aria-live')).toBe('assertive')
    expect(button('Subir foto').disabled).toBe(false)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('mantiene el editor abierto y restablece la carga si DELETE rechaza la red', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ok: true, sourceEtag: '"uploaded-source"' }),
          { status: 200 },
        ),
      )
      .mockRejectedValueOnce(new TypeError('sin red'))
    processor.extractPlayerCutout.mockResolvedValue(cutoutBlob())
    processor.composePlayerCardPhoto.mockResolvedValue(previewBlob())
    await render(
      <FriendlyPlayerPhotoUpload
        playerId="player-1"
        firstName="Rodrigo"
        lastName="Olave"
        hasPhoto={true}
      />,
    )

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [sourcePhoto()],
    })
    act(() => {
      input?.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await flushUpdates()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()

    await act(async () => {
      button('Quitar').click()
    })
    await flushUpdates()

    const alert = document.querySelector('[role="alert"]')
    expect(alert?.textContent).toContain('No se pudo eliminar la foto')
    expect(alert?.getAttribute('aria-live')).toBe('assertive')
    expect(button('Cambiar foto').disabled).toBe(false)
    expect(button('Quitar').disabled).toBe(false)
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it('cierra el editor y descarta su fuente al quitar la foto original', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ok: true, sourceEtag: '"uploaded-source"' }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    processor.extractPlayerCutout.mockResolvedValue(cutoutBlob())
    processor.composePlayerCardPhoto.mockResolvedValue(previewBlob())
    await render(
      <FriendlyPlayerPhotoUpload
        playerId="player-1"
        firstName="Rodrigo"
        lastName="Olave"
        hasPhoto={true}
      />,
    )

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [sourcePhoto()],
    })
    act(() => {
      input?.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await flushUpdates()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()

    await act(async () => {
      button('Quitar').click()
    })
    await flushUpdates()

    expect(fetchMock).toHaveBeenLastCalledWith('/api/players/player-1/photo', {
      method: 'DELETE',
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})
