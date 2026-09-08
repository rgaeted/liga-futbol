'use client'

import { useState } from 'react'
import { playerRegisterInviteText } from '@/lib/player-register-invite-text'

export function CopyRegisterLinkButton({
  registerPath,
  playerName,
  organizationName,
}: {
  registerPath: string
  playerName: string
  organizationName?: string | null
}) {
  const [copied, setCopied] = useState(false)

  function absoluteUrl() {
    return `${window.location.origin}${registerPath}`
  }

  function shareWhatsApp() {
    const text = playerRegisterInviteText(playerName, absoluteUrl(), organizationName)
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  async function copy() {
    await navigator.clipboard.writeText(absoluteUrl())
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={shareWhatsApp}
        className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
      >
        WhatsApp
      </button>
      <button
        type="button"
        onClick={() => void copy()}
        className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
      >
        {copied ? 'Copiado' : 'Link de registro'}
      </button>
    </span>
  )
}
