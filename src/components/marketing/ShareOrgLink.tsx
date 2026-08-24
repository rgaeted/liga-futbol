'use client'

import { useState } from 'react'

export function ShareOrgLink({ orgName, slug }: { orgName: string; slug: string }) {
  const [copied, setCopied] = useState(false)

  function absoluteUrl() {
    return `${window.location.origin}/${slug}`
  }

  function shareWhatsApp() {
    const text = `${orgName} — ${absoluteUrl()}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absoluteUrl())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={shareWhatsApp}
        className="btn-kelme-outline rounded-[10px] px-4 py-2 font-ui text-sm font-semibold"
      >
        WhatsApp
      </button>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="btn-kelme-outline rounded-[10px] px-4 py-2 font-ui text-sm font-semibold"
      >
        {copied ? 'Link copiado' : 'Copiar link'}
      </button>
    </div>
  )
}
