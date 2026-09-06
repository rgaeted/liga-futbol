'use client'

import { useState } from 'react'
import { playerRegisterPath } from '@/lib/player-register-link'

export function CopyRegisterLinkButton({
  playerId,
  orgSlug,
}: {
  playerId: string
  orgSlug: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const url = `${window.location.origin}${playerRegisterPath(playerId, orgSlug)}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
    >
      {copied ? 'Copiado' : 'Link de registro'}
    </button>
  )
}
