'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { RegisterForm } from '@/app/(auth)/register/RegisterForm'
import type { AvailablePlayer } from '@/app/(auth)/register/RegisterForm'

function safeCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

function LoginForm({
  callbackUrl,
  notice,
}: {
  callbackUrl: string
  notice: string
}) {
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

    if (result?.error) {
      setLoading(false)
      setError('Credenciales inválidas')
      return
    }

    const params = new URLSearchParams({ redirect: '1' })
    if (callbackUrl !== '/') {
      params.set('callbackUrl', callbackUrl)
    }
    window.location.assign(`/api/auth/post-login?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center">
        <h1 className="font-display text-xl font-black text-[#E8E4D8]">Ingresar</h1>
        <p className="mt-1 font-ui text-sm text-[#8A938C]">Accede a LigaLab</p>
      </div>
      {notice ? <p className="font-ui text-sm font-semibold text-[#E8E4D8]">{notice}</p> : null}
      <input name="email" type="email" placeholder="Email" required className="input-kelme" />
      <input name="password" type="password" placeholder="Contraseña" required className="input-kelme" />
      {error ? <p className="font-ui text-sm font-semibold text-org-primary">{error}</p> : null}
      <button type="submit" disabled={loading} className="btn-kelme w-full">
        {loading ? 'Entrando…' : 'Ingresar'}
      </button>
    </form>
  )
}

type Props = {
  lockedPlayer?: AvailablePlayer | null
  claimToken?: string | null
  inviteInvalid?: boolean
}

export function AuthPanel({ lockedPlayer = null, claimToken = null, inviteInvalid = false }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'))
  const hasPersonalInvite = Boolean(lockedPlayer && claimToken)
  const mode =
    searchParams.get('mode') === 'register' || searchParams.get('player') || inviteInvalid
      ? 'register'
      : 'login'
  const [notice, setNotice] = useState('')

  function goTo(next: 'login' | 'register') {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'register') {
      params.set('mode', 'register')
    } else {
      params.delete('mode')
    }
    const query = params.toString()
    router.replace(query ? `/login?${query}` : '/login', { scroll: false })
  }

  return (
    <div className="card-kelme p-8">
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-[#0B1210] p-1">
        <button
          type="button"
          onClick={() => goTo('login')}
          className={`rounded-lg px-3 py-2 font-display text-[13px] font-bold uppercase tracking-[0.12em] ${
            mode === 'login' ? 'bg-org-primary text-[#0B1210]' : 'text-[#8A938C] hover:text-[#E8E4D8]'
          }`}
        >
          Ingresar
        </button>
        <button
          type="button"
          onClick={() => goTo('register')}
          className={`rounded-lg px-3 py-2 font-display text-[13px] font-bold uppercase tracking-[0.12em] ${
            mode === 'register' ? 'bg-org-primary text-[#0B1210]' : 'text-[#8A938C] hover:text-[#E8E4D8]'
          }`}
        >
          Crear cuenta
        </button>
      </div>

      {mode === 'register' ? (
        <RegisterForm
          lockedPlayer={lockedPlayer}
          claimToken={claimToken}
          inviteInvalid={inviteInvalid}
          onSuccess={() => {
            setNotice('Cuenta creada. Ingresa con tu email.')
            const params = new URLSearchParams(searchParams.toString())
            params.delete('mode')
            params.delete('player')
            params.delete('token')
            const query = params.toString()
            router.replace(query ? `/login?${query}` : '/login', { scroll: false })
          }}
        />
      ) : (
        <LoginForm callbackUrl={callbackUrl} notice={notice} />
      )}
      {hasPersonalInvite && mode === 'register' ? (
        <p className="mt-4 text-center font-ui text-xs text-[#8A938C]">
          Este link es personal: solo puedes crear la cuenta de{' '}
          <span className="font-semibold text-[#E8E4D8]">
            {lockedPlayer!.firstName} {lockedPlayer!.lastName}
          </span>
          .
        </p>
      ) : null}
    </div>
  )
}
