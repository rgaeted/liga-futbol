'use client'

import { useMemo, useState } from 'react'
import type { FootballFormat } from '@prisma/client'
import {
  getDefaultScheme,
  getFormationSchemes,
  getFormationSlots,
  normalizeSchemeForFormat,
} from '@/lib/formations'
import { buildLineupView } from '@/lib/match-lineup'
import { type SlotLayout } from '@/lib/formation-slot-layout'
import { footballFormatLabel } from '@/lib/football-format'
import { calculateFormationFit, playerFitScoreForSlot } from '@/lib/formation-position-fit'
import {
  customSchemeValue,
  formatTemplateOptionLabel,
  isCustomSchemeValue,
  resolveEditorSchemeSelection,
} from '@/lib/user-formation-templates'
import { FormationPitch } from './FormationPitch'
import { FormationFitScore, PlayerFitBadge } from './FormationFitScore'
import { useFormationTemplates } from './useFormationTemplates'

export type EditorPlayer = {
  id: string
  label: string
  photoUrl?: string | null
  primaryPosition?: string | null
  secondaryPosition?: string | null
}

export type FormationSavePayload = {
  scheme: string
  slots: Array<{ slotKey: string; playerId: string }>
  benchPlayerIds: string[]
  slotLayout: SlotLayout | null
}

type Props = {
  footballFormat: FootballFormat
  initialScheme?: string
  initialSlots?: Record<string, string>
  initialSlotLayout?: SlotLayout | null
  players: EditorPlayer[]
  onSave: (payload: FormationSavePayload) => Promise<void>
  saveLabel?: string
  readOnly?: boolean
}

function layoutSignature(layout: SlotLayout): string {
  return JSON.stringify(
    Object.keys(layout)
      .sort()
      .map((key) => [key, layout[key]])
  )
}

export function FormationEditor({
  footballFormat,
  initialScheme,
  initialSlots = {},
  initialSlotLayout = null,
  players,
  onSave,
  saveLabel = 'Guardar formación',
  readOnly = false,
}: Props) {
  const schemes = useMemo(() => getFormationSchemes(footballFormat), [footballFormat])
  const defaultScheme = useMemo(() => getDefaultScheme(footballFormat), [footballFormat])
  const resolvedInitialScheme = normalizeSchemeForFormat(initialScheme ?? defaultScheme, footballFormat)

  const { templates, createTemplate, renameTemplate, deleteTemplate } =
    useFormationTemplates(footballFormat)

  const [scheme, setScheme] = useState(resolvedInitialScheme)
  const [selectValue, setSelectValue] = useState(resolvedInitialScheme)
  const [slots, setSlots] = useState<Record<string, string>>(initialSlots)
  const [slotLayout, setSlotLayout] = useState<SlotLayout>(initialSlotLayout ?? {})
  const [layoutMode, setLayoutMode] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [error, setError] = useState('')

  const assignedIds = useMemo(() => new Set(Object.values(slots)), [slots])

  const lineup = buildLineupView({
    scheme,
    footballFormat,
    slotLayout,
    assignments: Object.entries(slots).map(([slotKey, playerId]) => {
      const player = players.find((p) => p.id === playerId)
      return {
        slotKey,
        playerId,
        playerName: player?.label ?? playerId,
        playerPhotoUrl: player?.photoUrl ?? null,
      }
    }),
    bench: players
      .filter((p) => !assignedIds.has(p.id))
      .map((p) => ({ playerId: p.id, playerName: p.label })),
  })

  const formationFit = useMemo(
    () =>
      calculateFormationFit({
        scheme,
        footballFormat,
        slots,
        players,
      }),
    [scheme, footballFormat, slots, players]
  )

  function applySchemeSelection(nextSelectValue: string) {
    const resolved = resolveEditorSchemeSelection(nextSelectValue, templates, footballFormat)
    setSelectValue(nextSelectValue)
    setScheme(resolved.scheme)
    setSlotLayout(resolved.slotLayout)

    const valid = new Set(getFormationSlots(resolved.scheme, footballFormat).map((s) => s.key))
    setSlots((prev) => {
      const nextSlots: Record<string, string> = {}
      for (const [k, v] of Object.entries(prev)) {
        if (valid.has(k)) nextSlots[k] = v
      }
      return nextSlots
    })
    setSelectedSlot(null)
  }

  function onSelectChange(nextSelectValue: string) {
    if (nextSelectValue === selectValue) return

    const resolved = resolveEditorSchemeSelection(nextSelectValue, templates, footballFormat)
    const layoutChanges =
      layoutSignature(resolved.slotLayout) !== layoutSignature(slotLayout) ||
      resolved.scheme !== scheme

    if (
      layoutChanges &&
      (Object.keys(slotLayout).length > 0 || isCustomSchemeValue(selectValue)) &&
      !window.confirm(
        'Cambiar la formación restablecerá las posiciones personalizadas en la cancha. ¿Continuar?'
      )
    ) {
      return
    }

    applySchemeSelection(nextSelectValue)
  }

  function handleSlotLayoutChange(slotKey: string, pos: { topPct: number; leftPct: number }) {
    setSlotLayout((prev) => ({ ...prev, [slotKey]: pos }))
    if (isCustomSchemeValue(selectValue)) {
      setSelectValue(scheme)
    }
  }

  function restoreDefaultLayout() {
    setSlotLayout({})
    if (isCustomSchemeValue(selectValue)) {
      setSelectValue(scheme)
    }
  }

  function assignPlayerToSelected(playerId: string) {
    if (!selectedSlot) return
    setSlots((prev) => {
      const next = { ...prev }
      for (const [k, v] of Object.entries(next)) {
        if (v === playerId) delete next[k]
      }
      next[selectedSlot] = playerId
      return next
    })
  }

  function clearSelectedSlot() {
    if (!selectedSlot) return
    setSlots((prev) => {
      const next = { ...prev }
      delete next[selectedSlot]
      return next
    })
  }

  async function handleSaveTemplate() {
    const name = window.prompt('Nombre de la formación personalizada')
    if (!name?.trim()) return

    setTemplateLoading(true)
    setError('')
    try {
      const template = await createTemplate({
        name: name.trim(),
        baseScheme: scheme,
        slotLayout,
      })
      setSelectValue(customSchemeValue(template.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la plantilla')
    } finally {
      setTemplateLoading(false)
    }
  }

  async function handleRenameTemplate(id: string, currentName: string) {
    const name = window.prompt('Nuevo nombre', currentName)
    if (!name?.trim() || name.trim() === currentName) return

    setTemplateLoading(true)
    setError('')
    try {
      await renameTemplate(id, name.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo renombrar la plantilla')
    } finally {
      setTemplateLoading(false)
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (
      !window.confirm('¿Eliminar esta formación personalizada? No se puede deshacer.')
    ) {
      return
    }

    setTemplateLoading(true)
    setError('')
    try {
      await deleteTemplate(id)
      if (selectValue === customSchemeValue(id)) {
        setSelectValue(scheme)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la plantilla')
    } finally {
      setTemplateLoading(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      await onSave({
        scheme,
        slots: Object.entries(slots).map(([slotKey, playerId]) => ({
          slotKey,
          playerId,
        })),
        benchPlayerIds: players.filter((p) => !assignedIds.has(p.id)).map((p) => p.id),
        slotLayout: Object.keys(slotLayout).length > 0 ? slotLayout : null,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setLoading(false)
    }
  }

  if (players.length === 0) {
    return (
      <p className="text-sm text-kelme-gray-400">
        Selecciona jugadores antes de definir la formación.
      </p>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-kelme-gray-400">
          {footballFormatLabel(footballFormat)}
        </p>
        <label className="block text-sm font-medium">
          Esquema
          <select
            value={selectValue}
            onChange={(e) => onSelectChange(e.target.value)}
            disabled={readOnly}
            className="mt-1 w-full input-kelme rounded-lg px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <optgroup label="Clásicas">
              {schemes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </optgroup>
            {templates.length > 0 && (
              <optgroup label="Mis formaciones">
                {templates.map((t) => (
                  <option key={t.id} value={customSchemeValue(t.id)}>
                    {formatTemplateOptionLabel(t.name, t.baseScheme)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        {!readOnly && templates.length > 0 && (
          <div className="space-y-2 rounded-lg border border-kelme-border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-kelme-gray-400">
              Mis formaciones
            </p>
            <ul className="space-y-1">
              {templates.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {formatTemplateOptionLabel(t.name, t.baseScheme)}
                  </span>
                  <span className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={templateLoading}
                      onClick={() => void handleRenameTemplate(t.id, t.name)}
                      className="text-kelme-gray-400 hover:underline disabled:opacity-50"
                    >
                      Renombrar
                    </button>
                    <button
                      type="button"
                      disabled={templateLoading}
                      onClick={() => void handleDeleteTemplate(t.id)}
                      className="text-kelme-red hover:underline disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <FormationFitScore fit={formationFit} />
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setLayoutMode((prev) => !prev)
                setSelectedSlot(null)
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                layoutMode
                  ? 'border-kelme-red bg-kelme-red/10 text-kelme-red'
                  : 'border-kelme-border bg-kelme-surface text-kelme-gray-400'
              }`}
            >
              {layoutMode ? 'Modo ajustar posiciones' : 'Ajustar posiciones'}
            </button>
            {Object.keys(slotLayout).length > 0 && (
              <button
                type="button"
                onClick={restoreDefaultLayout}
                className="text-sm text-kelme-gray-400 hover:underline"
              >
                Restaurar posiciones
              </button>
            )}
            {Object.keys(slotLayout).length > 0 && (
              <button
                type="button"
                disabled={templateLoading}
                onClick={() => void handleSaveTemplate()}
                className="text-sm font-medium text-kelme-red hover:underline disabled:opacity-50"
              >
                Guardar como formación personalizada
              </button>
            )}
          </div>
        )}
        {layoutMode && !readOnly && (
          <p className="text-xs text-kelme-gray-400">
            Arrastra los jugadores en la cancha para ajustar su posición. El arquero no se puede mover.
          </p>
        )}
        <FormationPitch
          lineup={lineup}
          selectedSlotKey={readOnly || layoutMode ? null : selectedSlot}
          onSelectSlot={readOnly || layoutMode ? undefined : setSelectedSlot}
          layoutMode={layoutMode}
          onSlotLayoutChange={readOnly ? undefined : handleSlotLayoutChange}
          readOnlyLayout={readOnly}
        />
        {selectedSlot && !readOnly && !layoutMode && (
          <button
            type="button"
            onClick={clearSelectedSlot}
            className="text-sm text-kelme-gray-400 hover:underline"
          >
            Quitar jugador del slot {selectedSlot}
          </button>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm text-kelme-gray-400">
          {readOnly
            ? 'Partido finalizado — formación de solo lectura.'
            : layoutMode
              ? 'Modo ajustar posiciones — arrastra los marcadores en la cancha.'
              : selectedSlot
                ? `Elige jugador para ${selectedSlot}`
                : 'Toca un slot en la cancha, luego elige un jugador'}
        </p>
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {players.map((p) => {
            const inPitch = assignedIds.has(p.id)
            const assignedSlot = inPitch
              ? Object.entries(slots).find(([, playerId]) => playerId === p.id)?.[0]
              : null
            const fitScore = assignedSlot
              ? playerFitScoreForSlot(assignedSlot, scheme, footballFormat, p)
              : null
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={readOnly || layoutMode || !selectedSlot}
                  onClick={() => assignPlayerToSelected(p.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm disabled:opacity-40 ${
                    inPitch
                      ? 'border-kelme-red/40 bg-kelme-red/5'
                      : 'border-kelme-border bg-kelme-surface'
                  }`}
                >
                  <span className="min-w-0 truncate">{p.label}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-kelme-gray-400">
                    {fitScore !== null && <PlayerFitBadge score={fitScore} />}
                    {inPitch ? 'En cancha' : 'Banco'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {!readOnly && (
          <button
            type="button"
            disabled={loading}
            onClick={handleSave}
            className="w-full btn-kelme rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
          >
            {loading ? 'Guardando…' : saveLabel}
          </button>
        )}
        {error && <p className="text-sm text-kelme-red">{error}</p>}
      </div>
    </div>
  )
}
