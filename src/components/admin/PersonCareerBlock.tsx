'use client'

import { useEffect, useState } from 'react'
import type { PersonCareer } from '@/lib/person-career'

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 text-center">
      <p className="text-xs text-kelme-gray-400">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}

function CareerColumn({
  title,
  bucket,
}: {
  title: string
  bucket: PersonCareer['league']
}) {
  return (
    <div className="space-y-2">
      <h4 className="font-semibold">{title}</h4>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <StatCell label="Partidos" value={bucket.matches} />
        <StatCell label="Goles" value={bucket.goals} />
        <StatCell label="Asistencias" value={bucket.assists} />
        <StatCell label="Amarillas" value={bucket.yellowCards} />
        <StatCell label="Rojas" value={bucket.redCards} />
        <StatCell label="MVP" value={bucket.mvps} />
      </div>
    </div>
  )
}

export function PersonCareerBlock({ personId }: { personId: string }) {
  const [career, setCareer] = useState<PersonCareer | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      const res = await fetch(`/api/admin/persons/${personId}/career`)
      if (cancelled) return
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(typeof data.error === 'string' ? data.error : 'No se pudo cargar la carrera')
        setCareer(null)
        setLoading(false)
        return
      }
      setCareer(await res.json())
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [personId])

  if (loading) {
    return <p className="text-sm text-kelme-gray-400">Cargando carrera…</p>
  }
  if (error) {
    return <p className="text-sm text-kelme-red">{error}</p>
  }
  if (!career) return null

  return (
    <div className="space-y-3 rounded-xl border border-kelme-border bg-kelme-surface p-4">
      <p className="text-sm text-kelme-gray-400">
        Carrera en esta plataforma (vista de tu organización)
      </p>
      <CareerColumn title="Liga" bucket={career.league} />
      <CareerColumn title="Amistosos" bucket={career.friendly} />
      <CareerColumn title="Total" bucket={career.total} />
    </div>
  )
}
