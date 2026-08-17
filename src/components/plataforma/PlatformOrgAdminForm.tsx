'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PlatformUserSearchResult } from '@/lib/platform-org-admins'
import {
  PlatformPanel,
  PlatformPanelInner,
  platformBtnGhostClass,
  platformBtnPrimaryClass,
  platformInputClass,
} from '@/components/plataforma/platform-ui'

type OrgOption = { id: string; slug: string; name: string }

export function PlatformOrgAdminForm({ organizations }: { organizations: OrgOption[] }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PlatformUserSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<PlatformUserSearchResult | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedUser) return

    const term = searchQuery.trim()
    if (term.length < 2) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }

    setSearchLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/plataforma/users/search?q=${encodeURIComponent(term)}`)
        if (!res.ok) {
          setSearchResults([])
          setSearchOpen(false)
          return
        }
        const body = (await res.json()) as PlatformUserSearchResult[]
        setSearchResults(body)
        setSearchOpen(true)
      } catch {
        setSearchResults([])
        setSearchOpen(false)
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchQuery, selectedUser])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectUser(user: PlatformUserSearchResult) {
    setSelectedUser(user)
    setSearchQuery('')
    setSearchResults([])
    setSearchOpen(false)
    setError('')
  }

  function clearSelectedUser() {
    setSelectedUser(null)
    setSearchQuery('')
    setSearchResults([])
    setSearchOpen(false)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const data = new FormData(form)
    const organizationIds = data.getAll('organizationIds').map(String)
    const password = String(data.get('password') ?? '')

    const res = await fetch('/api/plataforma/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: String(data.get('email') ?? ''),
        name: String(data.get('name') ?? ''),
        password: password.length > 0 ? password : undefined,
        organizationIds,
      }),
    })

    if (!res.ok) {
      setLoading(false)
      const body = (await res.json().catch(() => null)) as { error?: unknown } | null
      setError(
        typeof body?.error === 'string'
          ? body.error
          : 'No pudimos dar el acceso. Revisa los datos e intenta de nuevo.',
      )
      return
    }

    router.refresh()
    form.reset()
    clearSelectedUser()
    setLoading(false)
  }

  return (
    <PlatformPanel>
      <PlatformPanelInner>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h2 className="text-[22px] font-black text-[#17171a]">Dar acceso</h2>
            <p className="mt-1 text-sm text-[#777]">
              Busca un usuario inscrito o ingresa los datos de una cuenta nueva.
            </p>
          </div>

          {selectedUser ? (
            <div className="rounded-[14px] border border-[#e5e5e9] bg-[#fafafa] px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-[#17171a]">{selectedUser.name}</p>
                  <p className="text-sm text-[#777]">{selectedUser.email}</p>
                  {selectedUser.memberships.length > 0 ? (
                    <p className="mt-1 text-xs text-[#999]">
                      Ya participa en:{' '}
                      {selectedUser.memberships
                        .map((m) => `${m.organization.name} (${m.role})`)
                        .join(', ')}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-[#999]">Sin membresías en empresas.</p>
                  )}
                </div>
                <button type="button" onClick={clearSelectedUser} className={platformBtnGhostClass}>
                  Cambiar usuario
                </button>
              </div>
            </div>
          ) : (
            <div ref={searchRef} className="relative">
              <label htmlFor="user-search" className="text-sm font-bold text-[#505058]">
                Buscar usuario inscrito
              </label>
              <input
                id="user-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                placeholder="Nombre o correo (mín. 2 caracteres)"
                autoComplete="off"
                className={`${platformInputClass} mt-1`}
              />
              {searchLoading ? <p className="mt-1 text-xs text-[#999]">Buscando…</p> : null}
              {searchOpen && searchResults.length > 0 ? (
                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-[14px] border border-[#e5e5e9] bg-white shadow-lg">
                  {searchResults.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        onClick={() => selectUser(user)}
                        className="flex w-full flex-col items-start px-4 py-3 text-left hover:bg-[#f7f7f9]"
                      >
                        <span className="text-sm font-extrabold text-[#17171a]">{user.name}</span>
                        <span className="text-sm text-[#777]">{user.email}</span>
                        {user.memberships.length > 0 ? (
                          <span className="mt-0.5 text-xs text-[#999]">
                            {user.memberships.map((m) => m.organization.name).join(', ')}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {searchOpen && !searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
                <p className="mt-1 text-xs text-[#999]">No encontramos usuarios con ese criterio.</p>
              ) : null}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              readOnly={Boolean(selectedUser)}
              defaultValue={selectedUser?.email ?? ''}
              key={selectedUser?.id ?? 'new-email'}
              className={`${platformInputClass} read-only:bg-[#f7f7f9] read-only:text-[#505058]`}
            />
            <input
              name="name"
              placeholder="Nombre"
              required
              minLength={2}
              readOnly={Boolean(selectedUser)}
              defaultValue={selectedUser?.name ?? ''}
              key={selectedUser?.id ?? 'new-name'}
              className={`${platformInputClass} read-only:bg-[#f7f7f9] read-only:text-[#505058]`}
            />
            {!selectedUser ? (
              <input
                name="password"
                type="password"
                placeholder="Contraseña (solo cuenta nueva)"
                minLength={6}
                className={`${platformInputClass} sm:col-span-2`}
              />
            ) : null}
          </div>

          {!selectedUser ? (
            <p className="text-xs text-[#999]">
              Si no encuentras al usuario, completa email, nombre y contraseña para crear una cuenta
              nueva.
            </p>
          ) : null}

          <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-[#505058]">Empresas</legend>
            {organizations.length === 0 ? (
              <p className="text-sm text-[#999]">No hay empresas activas.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {organizations.map((org) => (
                  <li key={org.id}>
                    <label className="flex items-center gap-2 rounded-[14px] border border-[#e5e5e9] px-3 py-2.5 text-sm font-semibold text-[#34343a] hover:bg-[#fafafa]">
                      <input
                        type="checkbox"
                        name="organizationIds"
                        value={org.id}
                        className="rounded accent-[#c91f26]"
                      />
                      <span>
                        {org.name}{' '}
                        <span className="text-[#999]">/{org.slug}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
          {error && <p className="text-sm font-semibold text-[#c91f26]">{error}</p>}
          <button type="submit" disabled={loading} className={platformBtnPrimaryClass}>
            {loading ? 'Guardando…' : 'Dar acceso'}
          </button>
        </form>
      </PlatformPanelInner>
    </PlatformPanel>
  )
}
