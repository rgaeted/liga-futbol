'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AdminAnalyticsHome } from '@/components/admin/AdminAnalyticsHome'
import { AdminDashboardSkeleton } from '@/components/admin/AdminDashboardSkeleton'
import { useOrgPath, useOrganizationSlug } from '@/hooks/useOrgPath'
import type { OrgAnalyticsDashboard } from '@/lib/admin-analytics'

function analyticsUrl(organizationSlug: string, period: string | null): string {
  const params = new URLSearchParams({ org: organizationSlug })
  if (period) params.set('period', period)
  return `/api/admin/analytics?${params.toString()}`
}

export function AdminAnalyticsClient() {
  const organizationSlug = useOrganizationSlug()
  const orgPath = useOrgPath()
  const searchParams = useSearchParams()
  const period = searchParams.get('period')
  const [data, setData] = useState<OrgAnalyticsDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async (): Promise<OrgAnalyticsDashboard> => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 25_000)
    try {
      const res = await fetch(analyticsUrl(organizationSlug, period), {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!res.ok) {
        throw new Error(
          res.status === 401 ? 'Sesión expirada' : 'Error al cargar las estadísticas',
        )
      }
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        throw new Error('Error al cargar las estadísticas')
      }
      return res.json() as Promise<OrgAnalyticsDashboard>
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('La carga tardó demasiado. Intenta de nuevo.')
      }
      throw err
    } finally {
      window.clearTimeout(timeout)
    }
  }, [organizationSlug, period])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    void fetchAnalytics()
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
          err instanceof Error ? err.message : 'Error al cargar las estadísticas',
        )
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [fetchAnalytics])

  function retry() {
    setLoading(true)
    setError(null)
    void fetchAnalytics()
      .then((payload) => {
        setData(payload)
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setData(null)
        setError(
          err instanceof Error ? err.message : 'Error al cargar las estadísticas',
        )
        setLoading(false)
      })
  }

  if (loading) return <AdminDashboardSkeleton />

  if (error || !data) {
    return (
      <div className="rounded-[14px] border border-[#2A3A32] bg-kelme-surface p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-[#E8E4D8]">
          No pudimos cargar las estadísticas
        </h1>
        <p className="mt-2 text-sm text-[#8A938C]">{error ?? 'Intenta de nuevo en unos segundos.'}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={retry}
            className="btn-kelme rounded-[10px] px-4 py-2 font-ui text-sm font-semibold"
          >
            Reintentar
          </button>
          {error === 'Sesión expirada' ? (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(orgPath('/admin/estadisticas'))}`}
              className="btn-kelme-outline rounded-[10px] px-4 py-2 font-ui text-sm font-semibold"
            >
              Volver a ingresar
            </Link>
          ) : (
            <Link
              href={orgPath('/admin/matches')}
              className="btn-kelme-outline rounded-[10px] px-4 py-2 font-ui text-sm font-semibold"
            >
              Ir a partidos
            </Link>
          )}
        </div>
      </div>
    )
  }

  return <AdminAnalyticsHome data={data} />
}
