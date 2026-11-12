'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from '@/components/admin/submit'

type Slot = { target: string; label: string; sponsorId: string | null }
type SponsorOption = { id: string; name: string }

export function SponsorAssignments({
  seasonId,
  slots,
  sponsors,
}: {
  seasonId: string
  slots: Slot[]
  sponsors: SponsorOption[]
}) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(slots.map((slot) => [slot.target, slot.sponsorId ?? ''])),
  )
  const [error, setError] = useState('')
  const [savingTarget, setSavingTarget] = useState<string | null>(null)

  async function change(target: string, sponsorId: string) {
    const previous = values[target]
    setValues((current) => ({ ...current, [target]: sponsorId }))
    setSavingTarget(target)
    setError('')
    const result = await submitJson(`/api/admin/seasons/${seasonId}/sponsors/assignments`, 'PUT', {
      target,
      sponsorId: sponsorId || null,
    })
    setSavingTarget(null)
    if (!result.ok) {
      setValues((current) => ({ ...current, [target]: previous }))
      setError(result.message)
      return
    }
    router.refresh()
  }

  return (
    <section className="space-y-3 rounded-lg border border-kelme-border p-4">
      <div>
        <h2 className="font-display text-lg font-semibold">Canchas y definiciones</h2>
        <p className="text-sm text-kelme-gray-600">
          El auspiciador elegido aparece como &ldquo;Cancha 1 · Nombre&rdquo; o &ldquo;Final
          presentada por Nombre&rdquo; en el fixture del landing.
        </p>
      </div>
      {slots.length === 0 ? (
        <p className="text-sm text-kelme-gray-600">
          Esta temporada aún no tiene partidos con cancha ni definiciones.
        </p>
      ) : (
        <ul className="divide-y divide-kelme-border">
          {slots.map((slot) => (
            <li key={slot.target} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span className="text-sm font-semibold">{slot.label}</span>
              <select
                aria-label={`Auspiciador de ${slot.label}`}
                value={values[slot.target] ?? ''}
                disabled={savingTarget === slot.target}
                onChange={(event) => void change(slot.target, event.target.value)}
                className="input-kelme rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Sin auspiciador</option>
                {sponsors.map((sponsor) => (
                  <option key={sponsor.id} value={sponsor.id}>
                    {sponsor.name}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  )
}
