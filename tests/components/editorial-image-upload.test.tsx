// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorialImageUpload } from '@/components/admin/content/EditorialImageUpload'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('EditorialImageUpload', () => {
  let container: HTMLDivElement
  let root: Root
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  const render = async (props: Partial<Parameters<typeof EditorialImageUpload>[0]> = {}) => {
    await act(async () => {
      root.render(
        <EditorialImageUpload label="Logo del auspiciador" fieldName="logo" uploadUrl="/up" {...props} />,
      )
    })
  }

  it('sin imagen muestra un recuadro vacío y el botón "Elegir imagen"', async () => {
    await render()
    expect(container.textContent).toContain('Logo del auspiciador')
    expect(container.textContent).toContain('Sin imagen')
    expect(container.textContent).toContain('Elegir imagen')
    expect(container.textContent).not.toContain('Quitar imagen')
  })

  it('con imagen muestra la vista previa, "Cambiar imagen" y "Quitar imagen"', async () => {
    await render({ previewUrl: '/logo.png', deleteUrl: '/del' })
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/logo.png')
    expect(container.textContent).toContain('Cambiar imagen')
    expect(container.textContent).toContain('Quitar imagen')
  })

  it('oculta el selector nativo de archivos y solo acepta JPG, PNG y WebP', async () => {
    await render()
    const input = container.querySelector('input[type="file"]')!
    expect(input.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp')
    expect(input.className).toMatch(/sr-only|hidden/)
  })

  it('sube la imagen elegida con el nombre de campo indicado', async () => {
    const onUploaded = vi.fn()
    await render({ onUploaded })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([new Uint8Array([1, 2, 3])], 'logo.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/up')
    expect((init.body as FormData).get('logo')).toBeInstanceOf(File)
    expect(onUploaded).toHaveBeenCalled()
  })

  it('muestra el mensaje de error del servidor si la subida falla', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Imagen demasiado grande' }), { status: 400 }))
    await render()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', {
      value: [new File([new Uint8Array([1])], 'x.png', { type: 'image/png' })],
      configurable: true,
    })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(container.textContent).toContain('Imagen demasiado grande')
  })
})
