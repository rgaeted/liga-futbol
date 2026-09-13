'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import {
  composePlayerCardPhoto,
  DEFAULT_CARD_PHOTO_ADJUSTMENTS,
  extractPlayerCutout,
  type CardPhotoAdjustments,
} from '@/lib/player-card-photo-process'
import {
  playerCardProcessingErrorMessage,
  playerCardSaveErrorMessage,
} from '@/lib/player-card-photo-errors'
import {
  PLAYER_CARD_PALETTE,
  PLAYER_CARD_SHIELD_CLIP_POLYGON,
  playerCardShieldPath,
} from '@/lib/player-card-shield'

type Props = {
  playerId: string
  playerName: string
  source: Blob
  sourceEtag: string
  onClose: () => void
  onSaved: () => void
}

type EditorStatus = 'processing' | 'ready' | 'saving' | 'error'
type ErrorKind = 'processing' | 'saving' | 'stale' | null

const PROCESSING_ERROR =
  'No pudimos preparar el recorte. Revisa la foto e inténtalo nuevamente.'

const SAVING_ERROR =
  'No se pudo guardar el recorte. Tu vista previa sigue disponible.'
const STALE_RELOAD_ERROR =
  'La foto original cambió, pero no pudimos cargar la versión vigente.'
const SOURCE_CHANGED_NOTICE =
  'La foto original cambió. Revisa la nueva vista previa antes de guardar.'
const PREVIEW_CLIP = PLAYER_CARD_SHIELD_CLIP_POLYGON
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function adjustmentKey(adjustments: CardPhotoAdjustments) {
  return `${adjustments.offsetX}:${adjustments.offsetY}:${adjustments.scale}`
}

export function PlayerCardPhotoEditorDialog({
  playerId,
  playerName,
  source,
  sourceEtag,
  onClose,
  onSaved,
}: Props) {
  const titleId = useId()
  const descriptionId = useId()
  const clipId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const mountedRef = useRef(false)
  const previewUrlRef = useRef<string | null>(null)
  const sourceRef = useRef<Blob | null>(null)
  const activeSourceRef = useRef(source)
  const sourceEtagRef = useRef(sourceEtag)
  const requestControllerRef = useRef<AbortController | null>(null)
  const saveRunRef = useRef(0)
  const extractionRunRef = useRef(0)
  const compositionRequestRef = useRef(0)
  const compositionPendingRef = useRef(true)
  const lastComposedAdjustmentRef = useRef<string | null>(null)
  const initialCompositionAdjustmentRef = useRef<string | null>(null)

  const [adjustments, setAdjustments] = useState<CardPhotoAdjustments>({
    ...DEFAULT_CARD_PHOTO_ADJUSTMENTS,
  })
  const [cutout, setCutout] = useState<Blob | null>(null)
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<EditorStatus>('processing')
  const [errorKind, setErrorKind] = useState<ErrorKind>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [sourceChangedNotice, setSourceChangedNotice] = useState('')

  const replacePreview = useCallback((blob: Blob) => {
    const nextUrl = URL.createObjectURL(blob)
    const previousUrl = previewUrlRef.current
    previewUrlRef.current = nextUrl
    setPreviewUrl(nextUrl)
    if (previousUrl) URL.revokeObjectURL(previousUrl)
  }, [])

  const prepareSource = useCallback(
    async (
      candidateSource: Blob,
      options?: { reset?: boolean; sourceChanged?: boolean },
    ) => {
      const extractionRun = ++extractionRunRef.current
      ++compositionRequestRef.current
      compositionPendingRef.current = true
      setStatus('processing')
      setErrorKind(null)
      setErrorMessage('')
      if (!options?.sourceChanged) setSourceChangedNotice('')
      if (options?.reset) {
        setCutout(null)
        setProcessedBlob(null)
      }

      let compositionRequest: number | null = null
      try {
        const extracted = await extractPlayerCutout(candidateSource)
        if (
          !mountedRef.current ||
          extractionRun !== extractionRunRef.current
        ) {
          return
        }

        const initialAdjustments = { ...DEFAULT_CARD_PHOTO_ADJUSTMENTS }
        const initialKey = adjustmentKey(initialAdjustments)
        compositionRequest = ++compositionRequestRef.current
        initialCompositionAdjustmentRef.current = initialKey
        setAdjustments(initialAdjustments)
        setCutout(extracted)

        const composed = await composePlayerCardPhoto(
          extracted,
          initialAdjustments,
        )
        if (
          !mountedRef.current ||
          extractionRun !== extractionRunRef.current ||
          compositionRequest !== compositionRequestRef.current
        ) {
          return
        }

        compositionPendingRef.current = false
        initialCompositionAdjustmentRef.current = null
        lastComposedAdjustmentRef.current = initialKey
        setProcessedBlob(composed)
        replacePreview(composed)
        setStatus('ready')
        if (options?.sourceChanged) {
          setSourceChangedNotice(SOURCE_CHANGED_NOTICE)
        }
      } catch (error) {
        if (
          !mountedRef.current ||
          extractionRun !== extractionRunRef.current ||
          (compositionRequest !== null &&
            compositionRequest !== compositionRequestRef.current)
        ) {
          return
        }
        compositionPendingRef.current = false
        initialCompositionAdjustmentRef.current = null
        setStatus('error')
        setErrorKind('processing')
        setErrorMessage(
          playerCardProcessingErrorMessage(error, PROCESSING_ERROR),
        )
      }
    },
    [replacePreview],
  )

  useEffect(() => {
    mountedRef.current = true
    if (
      !previousFocusRef.current &&
      document.activeElement instanceof HTMLElement
    ) {
      previousFocusRef.current = document.activeElement
    }
    dialogRef.current?.focus()
    return () => {
      mountedRef.current = false
      saveRunRef.current += 1
      requestControllerRef.current?.abort()
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus()
      }
    }
  }, [])

  useEffect(() => {
    sourceEtagRef.current = sourceEtag
    activeSourceRef.current = source
    if (sourceRef.current === source) return
    saveRunRef.current += 1
    requestControllerRef.current?.abort()
    sourceRef.current = source
    void prepareSource(source)
  }, [prepareSource, source, sourceEtag])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && status !== 'saving') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (element) =>
          !element.hasAttribute('hidden') &&
          element.getAttribute('aria-hidden') !== 'true',
      )

      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeElement = document.activeElement
      if (activeElement === dialog || !dialog.contains(activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first)?.focus()
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, status])

  useEffect(() => {
    if (!cutout) return
    const nextKey = adjustmentKey(adjustments)
    if (
      nextKey === lastComposedAdjustmentRef.current ||
      nextKey === initialCompositionAdjustmentRef.current
    ) {
      return
    }

    const compositionRequest = compositionRequestRef.current
    const timer = window.setTimeout(async () => {
      try {
        const composed = await composePlayerCardPhoto(cutout, adjustments)
        if (
          !mountedRef.current ||
          compositionRequest !== compositionRequestRef.current
        ) {
          return
        }
        compositionPendingRef.current = false
        lastComposedAdjustmentRef.current = nextKey
        setProcessedBlob(composed)
        replacePreview(composed)
        setStatus('ready')
      } catch (error) {
        if (
          !mountedRef.current ||
          compositionRequest !== compositionRequestRef.current
        ) {
          return
        }
        compositionPendingRef.current = false
        setStatus('error')
        setErrorKind('processing')
        setErrorMessage(
          playerCardProcessingErrorMessage(error, PROCESSING_ERROR),
        )
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [adjustments, cutout, replacePreview])

  function updateAdjustment(
    field: keyof CardPhotoAdjustments,
    value: string,
  ) {
    requestAdjustments({
      ...adjustments,
      [field]: Number(value),
    })
  }

  function requestAdjustments(next: CardPhotoAdjustments) {
    const returnsToComposedPreview =
      Boolean(processedBlob) &&
      adjustmentKey(next) === lastComposedAdjustmentRef.current
    initialCompositionAdjustmentRef.current = null
    ++compositionRequestRef.current
    compositionPendingRef.current = !returnsToComposedPreview
    setStatus(returnsToComposedPreview ? 'ready' : 'processing')
    setErrorKind(null)
    setErrorMessage('')
    setAdjustments(next)
  }

  const canSaveCurrentPreview =
    Boolean(processedBlob) &&
    !compositionPendingRef.current &&
    (status === 'ready' || (status === 'error' && errorKind === 'saving'))

  async function reloadLatestSource(saveRun = ++saveRunRef.current) {
    requestControllerRef.current?.abort()
    const controller = new AbortController()
    requestControllerRef.current = controller
    compositionPendingRef.current = true
    setProcessedBlob(null)
    setCutout(null)
    setStatus('processing')
    setErrorKind(null)
    setErrorMessage('')
    setSourceChangedNotice('')

    try {
      const response = await fetch(`/api/players/${playerId}/photo`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      const latestEtag = response.headers.get('etag')
      if (!response.ok || !latestEtag) throw new Error('latest source failed')
      const latestSource = await response.blob()
      if (
        !mountedRef.current ||
        controller.signal.aborted ||
        saveRun !== saveRunRef.current
      ) {
        return
      }
      activeSourceRef.current = latestSource
      sourceEtagRef.current = latestEtag
      await prepareSource(latestSource, { reset: true, sourceChanged: true })
    } catch {
      if (
        !mountedRef.current ||
        controller.signal.aborted ||
        saveRun !== saveRunRef.current
      ) {
        return
      }
      compositionPendingRef.current = false
      setStatus('error')
      setErrorKind('stale')
      setErrorMessage(STALE_RELOAD_ERROR)
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null
      }
    }
  }

  async function save() {
    if (!processedBlob || !canSaveCurrentPreview) return

    const saveRun = ++saveRunRef.current
    requestControllerRef.current?.abort()
    const controller = new AbortController()
    requestControllerRef.current = controller
    setStatus('saving')
    setErrorKind(null)
    setErrorMessage('')
    const form = new FormData()
    form.append(
      'photo',
      new File([processedBlob], 'card-photo.png', { type: 'image/png' }),
    )

    try {
      const response = await fetch(`/api/players/${playerId}/card-photo`, {
        method: 'POST',
        body: form,
        headers: {
          'If-Match': sourceEtagRef.current,
          'X-Photo-Source-ETag': sourceEtagRef.current,
        },
        signal: controller.signal,
      })
      if (
        !mountedRef.current ||
        controller.signal.aborted ||
        saveRun !== saveRunRef.current
      ) {
        return
      }
      if (response.status === 412) {
        await reloadLatestSource(saveRun)
        return
      }
      if (!response.ok) {
        setStatus('error')
        setErrorKind('saving')
        setErrorMessage(await playerCardSaveErrorMessage(response, SAVING_ERROR))
        return
      }
      onSaved()
    } catch {
      if (
        !mountedRef.current ||
        controller.signal.aborted ||
        saveRun !== saveRunRef.current
      ) {
        return
      }
      setStatus('error')
      setErrorKind('saving')
      setErrorMessage(SAVING_ERROR)
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null
      }
    }
  }

  const hasPreview = Boolean(previewUrl && processedBlob)
  const controlsDisabled =
    !cutout ||
    status === 'saving' ||
    (status === 'error' &&
      (errorKind === 'processing' || errorKind === 'stale'))
  const shieldWidth = 270
  const shieldHeight = 400
  const shield = playerCardShieldPath(shieldWidth, shieldHeight)

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="card-kelme relative max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl overflow-y-auto p-4 text-[#E8E4D8] shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-org-primary sm:max-h-[calc(100dvh-3rem)] sm:p-6"
      >
        <button
          type="button"
          aria-label="Cerrar editor"
          disabled={status === 'saving'}
          onClick={onClose}
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-kelme-border bg-[#0B1210] text-xl text-kelme-gray-400 transition hover:border-org-primary hover:text-[#E8E4D8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-org-primary disabled:opacity-40"
        >
          ×
        </button>

        <div className="pr-12">
          <p className="font-data text-[11px] font-bold uppercase tracking-[0.2em] text-org-primary">
            Foto de carta
          </p>
          <h2 id={titleId} className="mt-1 font-display text-2xl font-bold sm:text-3xl">
            Ajusta el recorte de {playerName}
          </h2>
          <p
            id={descriptionId}
            className="mt-2 max-w-2xl text-sm leading-6 text-kelme-gray-400"
          >
            La primera vez puede tardar más porque el modelo se descarga en tu
            navegador. La foto se procesa localmente y no se envía a un servicio
            externo de imágenes.
          </p>
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)] md:items-center">
          <div className="flex min-w-0 justify-center">
            <div
              className="relative aspect-[270/400] w-full max-w-[270px] overflow-hidden"
              aria-label="Vista previa de la carta"
            >
              <div
                className="absolute inset-0"
                style={{
                  clipPath: PREVIEW_CLIP,
                  background:
                    'radial-gradient(circle at 50% 28%, rgba(61,230,140,0.24), transparent 30%), linear-gradient(145deg, #1a3828 0%, #0c1611 52%, #14241d 100%)',
                }}
              />
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={`Recorte de ${playerName}`}
                  className="absolute inset-0 h-full w-full object-contain object-bottom"
                  style={{ clipPath: PREVIEW_CLIP }}
                />
              ) : null}
              <svg
                viewBox={`0 0 ${shieldWidth} ${shieldHeight}`}
                className="pointer-events-none absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient
                    id={clipId}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#c79a3e" />
                    <stop offset="50%" stopColor="#e8c878" />
                    <stop offset="100%" stopColor="#fff3d0" />
                  </linearGradient>
                </defs>
                <path
                  d={shield}
                  fill="none"
                  stroke={`url(#${clipId})`}
                  strokeWidth="4"
                />
                <path
                  d={`M 35 88 L 235 288 M 82 34 L 257 209`}
                  fill="none"
                  stroke={PLAYER_CARD_PALETTE.lines}
                  strokeWidth="2"
                  opacity="0.2"
                />
              </svg>
              {!hasPreview ? (
                <div className="absolute inset-0 grid place-items-center px-10 text-center">
                  <span
                    role="status"
                    aria-live="polite"
                    className="rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-sm font-semibold text-[#E8E4D8]"
                  >
                    {status === 'processing'
                      ? cutout
                        ? 'Actualizando vista previa…'
                        : 'Separando a la persona del fondo…'
                      : 'Vista previa no disponible'}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold">
              <span className="flex items-center justify-between gap-3">
                Mover horizontalmente
                <output className="font-data text-xs text-kelme-gray-400">
                  {adjustments.offsetX.toFixed(2)}
                </output>
              </span>
              <input
                aria-label="Mover horizontalmente"
                type="range"
                min="-0.2"
                max="0.2"
                step="0.01"
                value={adjustments.offsetX}
                disabled={controlsDisabled}
                onChange={(event) =>
                  updateAdjustment('offsetX', event.target.value)
                }
                className="mt-2 w-full accent-[color:var(--org-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-org-primary"
              />
            </label>

            <label className="block text-sm font-semibold">
              <span className="flex items-center justify-between gap-3">
                Mover verticalmente
                <output className="font-data text-xs text-kelme-gray-400">
                  {adjustments.offsetY.toFixed(2)}
                </output>
              </span>
              <input
                aria-label="Mover verticalmente"
                type="range"
                min="-0.2"
                max="0.2"
                step="0.01"
                value={adjustments.offsetY}
                disabled={controlsDisabled}
                onChange={(event) =>
                  updateAdjustment('offsetY', event.target.value)
                }
                className="mt-2 w-full accent-[color:var(--org-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-org-primary"
              />
            </label>

            <label className="block text-sm font-semibold">
              <span className="flex items-center justify-between gap-3">
                Tamaño
                <output className="font-data text-xs text-kelme-gray-400">
                  {adjustments.scale.toFixed(2)}×
                </output>
              </span>
              <input
                aria-label="Tamaño"
                type="range"
                min="0.8"
                max="1.35"
                step="0.01"
                value={adjustments.scale}
                disabled={controlsDisabled}
                onChange={(event) =>
                  updateAdjustment('scale', event.target.value)
                }
                className="mt-2 w-full accent-[color:var(--org-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-org-primary"
              />
            </label>

            <button
              type="button"
              disabled={
                controlsDisabled ||
                adjustmentKey(adjustments) ===
                  adjustmentKey(DEFAULT_CARD_PHOTO_ADJUSTMENTS)
              }
              onClick={() =>
                requestAdjustments({ ...DEFAULT_CARD_PHOTO_ADJUSTMENTS })
              }
              className="btn-kelme-outline w-full py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-org-primary"
            >
              Restablecer encuadre
            </button>

            {sourceChangedNotice ? (
              <p role="alert" className="text-sm font-semibold text-[#ffd27a]">
                {sourceChangedNotice}
              </p>
            ) : errorMessage ? (
              <p role="alert" className="text-sm font-semibold text-[#ff8f8f]">
                {errorMessage}
              </p>
            ) : status === 'ready' ? (
              <p role="status" aria-live="polite" className="text-sm text-kelme-gray-400">
                Recorte listo. Puedes ajustar el encuadre antes de guardarlo.
              </p>
            ) : null}

            {errorKind === 'processing' ? (
              <button
                type="button"
                onClick={() =>
                  void prepareSource(activeSourceRef.current, { reset: true })
                }
                className="btn-kelme w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-org-primary"
              >
                Reintentar
              </button>
            ) : errorKind === 'stale' ? (
              <button
                type="button"
                onClick={() => void reloadLatestSource()}
                className="btn-kelme w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-org-primary"
              >
                Cargar foto vigente
              </button>
            ) : (
              <button
                type="button"
                disabled={!canSaveCurrentPreview}
                onClick={() => void save()}
                className="btn-kelme w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-org-primary"
              >
                {status === 'saving' ? 'Guardando…' : 'Guardar recorte'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
