'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Credenciales inválidas')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-slate-900 p-8 shadow-lg"
      >
        <h1 className="text-2xl font-bold text-white">Liga Fútbol</h1>
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white"
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}
