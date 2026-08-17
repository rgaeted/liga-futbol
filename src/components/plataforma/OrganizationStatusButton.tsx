'use client'

import { useRouter } from 'next/navigation'
import { platformBtnGhostClass } from '@/components/plataforma/platform-ui'

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
    <button type="button" onClick={handleClick} className={platformBtnGhostClass}>
      {label}
    </button>
  )
}
