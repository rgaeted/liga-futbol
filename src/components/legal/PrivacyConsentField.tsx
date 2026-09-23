'use client'

import Link from 'next/link'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
}

export function PrivacyConsentField({ checked, onChange, id = 'privacy-consent' }: Props) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#2A3A32] bg-[#0B1210] p-3.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className="mt-0.5 rounded accent-[color:var(--org-primary)]"
      />
      <span className="font-ui text-xs leading-relaxed text-[#8A938C]">
        He leído y acepto la{' '}
        <Link href="/privacidad" target="_blank" className="font-semibold text-org-primary hover:underline">
          Política de Privacidad
        </Link>{' '}
        de LigaLab, incluido el tratamiento de mis datos conforme a la Ley N° 19.628 y las medidas de
        seguridad descritas para cumplir el marco de ciberseguridad chileno.
      </span>
    </label>
  )
}
