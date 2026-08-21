'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AdminDashboardHome } from '@/components/admin/AdminDashboardHome'
import { AdminDashboardSkeleton } from '@/components/admin/AdminDashboardSkeleton'
import { useOrgPath, useOrganizationSlug } from '@/hooks/useOrgPath'
import type { AdminDashboardData } from '@/lib/admin-dashboard'

function dashboardUrl(organizationSlug: string, seasonId: string | null): string {
  const params = new URLSearchParams({ org: organizationSlug })
  if (seasonId) params.set('season', seasonId)
  return `/api/admin/dashboard?${params.toString()}`
}

export function AdminDashboardClient() {
  const organizationSlug = useOrganizationSlug()
  const orgPath = useOrgPath()
  const searchParams = useSearchParams()
  const seasonId = searchParams.get('season')
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = useCallback(async (): Promise<AdminDashboardData> => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 25_000)
    try {
      const res = await fetch(dashboardUrl(organizationSlug, seasonId), {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!res.ok) {
        throw new Error(
          res.status === 401 ? 'Sesión expirada' : 'Error al cargar el panel',
        )
      }
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        throw new Error('Error al cargar el panel')
      }
      return res.json() as Promise<AdminDashboardData>
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('La carga tardó demasiado. Intenta de nuevo.')
      }
      throw err
    } finally {
      window.clearTimeout(timeout)
    }
  }, [organizationSlug, seasonId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    void fetchDashboard()
      .then((payload) => {
        if (cancelled) return
        setData(payload)
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setData(null)
        setError(
          err instanceof Error ? err.message : 'Error al cargar el panel',
        )
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [fetchDashboard])

  function retry() {
    setLoading(true)
    setError(null)
    void fetchDashboard()
      .then((payload) => {
        setData(payload)
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setData(null)
        setError(
          err instanceof Error ? err.message : 'Error al cargar el panel',
        )
        setLoading(false)
      })
  }

  if (loading) return <AdminDashboardSkeleton />

  if (error || !data) {
    return (
      <div className="rounded-[14px] border border-red-200 bg-white p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-zinc-900">
          No pudimos cargar el panel
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {error ??
            'Hubo un problema al cargar los datos. Intenta de nuevo en unos segundos.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={retry}
            className="rounded-[10px] bg-[#b91c1c] px-4 py-2 font-ui text-sm font-semibold text-white hover:bg-[#9f1728]"
          >
            Reintentar
          </button>
          {error === 'Sesión expirada' ? (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(orgPath('/admin'))}`}
              className="rounded-[10px] border border-zinc-200 px-4 py-2 font-ui text-sm font-semibold text-zinc-600 hover:bg-zinc-100"
            >
              Volver a ingresar
            </Link>
          ) : (
            <Link
              href={orgPath('/admin/matches')}
              className="rounded-[10px] border border-zinc-200 px-4 py-2 font-ui text-sm font-semibold text-zinc-600 hover:bg-zinc-100"
            >
              Ir a partidos
            </Link>
          )}
        </div>
      </div>
    )
  }

  return <AdminDashboardHome data={data} />
}
