'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FootballFormat } from '@prisma/client'
import type { SlotLayout } from '@/lib/formation-slot-layout'
import type { UserFormationTemplateDto } from '@/lib/user-formation-templates'

export function useFormationTemplates(footballFormat: FootballFormat) {
  const [templates, setTemplates] = useState<UserFormationTemplateDto[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/me/formation-templates?format=${footballFormat}`)
    if (res.ok) {
      const data = await res.json()
      setTemplates(data.templates ?? [])
    }
    setLoading(false)
  }, [footballFormat])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function createTemplate(input: {
    name: string
    baseScheme: string
    slotLayout: SlotLayout
  }): Promise<UserFormationTemplateDto> {
    const res = await fetch('/api/me/formation-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, footballFormat }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(
        typeof data.error === 'string' ? data.error : 'No se pudo guardar la plantilla'
      )
    }
    const data = await res.json()
    await refresh()
    return data.template as UserFormationTemplateDto
  }

  async function renameTemplate(id: string, name: string): Promise<void> {
    const res = await fetch(`/api/me/formation-templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(
        typeof data.error === 'string' ? data.error : 'No se pudo renombrar la plantilla'
      )
    }
    await refresh()
  }

  async function deleteTemplate(id: string): Promise<void> {
    const res = await fetch(`/api/me/formation-templates/${id}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 204) {
      const data = await res.json().catch(() => ({}))
      throw new Error(
        typeof data.error === 'string' ? data.error : 'No se pudo eliminar la plantilla'
      )
    }
    await refresh()
  }

  return { templates, loading, refresh, createTemplate, renameTemplate, deleteTemplate }
}
