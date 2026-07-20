'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { readApiError } from '@/lib/api-error'
import {
  FriendlyPlayerProfileFields,
  readFriendlyPlayerProfileFromForm,
} from './FriendlyPlayerProfileFields'

async function uploadPhoto(playerId: string, file: File): Promise<string | null> {
  const form = new FormData()
  form.append('photo', file)
  const res = await fetch(`/api/friendly-players/${playerId}/photo`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return typeof data.error === 'string' ? data.error : 'No se pudo subir la foto'
  }
  return null
}

export function FriendlyPlayerForm() {
  const router = useRouter()
  const photoRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setLoading(true)
    setError('')
    const form = new FormData(formEl)
    const email = String(form.get('email') ?? '').trim()
    const photoFile = photoRef.current?.files?.[0]
    const password = String(form.get('password') ?? '').trim()
    const payload: Record<string, string> = {
      firstName: String(form.get('firstName') ?? '').trim(),
      lastName: String(form.get('lastName') ?? '').trim(),
      ...readFriendlyPlayerProfileFromForm(form),
    }
    if (email) {
      if (!password) {
        setLoading(false)
        setError('Si ingresas email, también debes ingresar una contraseña.')
        return
      }
      payload.email = email
      payload.password = password
    }

    const res = await fetch('/api/friendly-players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      setLoading(false)
      setError(await readApiError(res))
      return
    }

    const created = (await res.json()) as { id: string }
    if (photoFile) {
      const photoError = await uploadPhoto(created.id, photoFile)
      if (photoError) {
        setLoading(false)
        setError(`Jugador creado, pero ${photoError.toLowerCase()}`)
        router.refresh()
        return
      }
    }

    setLoading(false)
    formEl.reset()
    if (photoRef.current) photoRef.current.value = ''
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-3">
      <input
        name="firstName"
        placeholder="Nombre"
        required
        className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
      />
      <input
        name="lastName"
        placeholder="Apellido"
        required
        className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
      />
      <FriendlyPlayerProfileFields />
      <label className="flex flex-col gap-1 md:col-span-3">
        <span className="text-sm text-kelme-gray-600">Foto (opcional)</span>
        <input
          ref={photoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-kelme-red file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white"
        />
        <span className="text-xs text-kelme-gray-400">JPG, PNG o WebP · máx. 500 KB</span>
      </label>
      <input
        name="email"
        type="email"
        placeholder="Email (opcional)"
        className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
      />
      <input
        name="password"
        type="password"
        placeholder="Contraseña (opcional)"
        className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50 md:col-span-3"
      >
        {loading ? 'Creando…' : 'Crear jugador amistoso'}
      </button>
      {error && <p className="text-sm text-kelme-red md:col-span-3">{error}</p>}
    </form>
  )
}
