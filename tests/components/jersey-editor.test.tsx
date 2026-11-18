// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JerseyEditor } from '@/components/referee/JerseyEditor'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const players = [
  { id: 'p1', label: 'Ana Pérez', jersey: 7, permanentJersey: 10 },
  { id: 'p2', label: 'Luis Soto', jersey: null, permanentJersey: 4 },
]

let container: HTMLDivElement
let root: Root
const fetchMock = vi.fn()
const onChange = vi.fn()

function render() {
  act(() => {
    root.render(<JerseyEditor matchId="m1" teamName="Norte" players={players} onChange={onChange} />)
  })
}

function input(name: string) {
  return container.querySelector<HTMLInputElement>(`input[aria-label="Dorsal de ${name}"]`)!
}

async function typeAndBlur(el: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

describe('JerseyEditor', () => {
  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    onChange.mockReset()
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  it('muestra el dorsal del partido y sugiere el permanente', () => {
    render()
    expect(input('Ana Pérez').value).toBe('7')
    expect(input('Luis Soto').value).toBe('')
    expect(input('Luis Soto').placeholder).toBe('4')
    expect(input('Ana Pérez').inputMode).toBe('numeric')
  })

  it('guarda el nuevo dorsal al salir del campo', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    render()
    await typeAndBlur(input('Luis Soto'), '12')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/matches/m1/jerseys',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ playerId: 'p2', number: 12 }),
      }),
    )
    expect(onChange).toHaveBeenCalledWith('p2', 12)
  })

  it('un campo vacío envía null', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    render()
    await typeAndBlur(input('Ana Pérez'), '')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/matches/m1/jerseys',
      expect.objectContaining({ body: JSON.stringify({ playerId: 'p1', number: null }) }),
    )
    expect(onChange).toHaveBeenCalledWith('p1', null)
  })

  it('sin cambios no llama a la API', async () => {
    render()
    await typeAndBlur(input('Ana Pérez'), '7')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ante un 409 muestra el error y restaura el valor', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'El dorsal 9 ya lo usa otro jugador de este equipo' }),
    })
    render()
    await typeAndBlur(input('Luis Soto'), '9')
    expect(container.textContent).toContain('El dorsal 9 ya lo usa otro jugador de este equipo')
    expect(input('Luis Soto').value).toBe('')
    expect(onChange).not.toHaveBeenCalled()
  })
})
