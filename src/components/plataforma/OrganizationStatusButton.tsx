'use client'

import { useRouter } from 'next/navigation'

type Props = {
  organizationId: string
  status: 'ACTIVE' | 'PAUSED'
}

export function OrganizationStatusButton({ organizationId, status }: Props) {
  const router = useRouter()
  const nextStatus = status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
  const label = status === 'ACTIVE' ? 'Pausar' : 'Reactivar'

  async function handleClick() {
    await fetch(`/api/plataforma/organizations/${organizationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
    >
      {label}
    </button>
  )
}
