'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { processPlayerCardPhoto } from '@/lib/player-card-photo-process'
import { playerCardProcessingErrorMessage } from '@/lib/player-card-photo-errors'
import { PlayerCardPhotoEditorDialog } from './PlayerCardPhotoEditorDialog'

export type PlayerCardPhotoBatchPlayer = {
  id: string
  name: string
  hasPhoto: boolean
  hasCardPhoto: boolean
  photoVersion: string
}

type DownloadError = {
  stage: 'download'
  player: PlayerCardPhotoBatchPlayer
  version: string
  message: string
}

type ProcessError = {
  stage: 'process'
  player: PlayerCardPhotoBatchPlayer
  version: string
  message: string
}

type SaveError = {
  stage: 'save'
  player: PlayerCardPhotoBatchPlayer
  version: string
  message: string
  sourceEtag: string
  processedBlob: Blob
  staleSource: boolean
}

type BatchError = DownloadError | ProcessError | SaveError

type RunItem = {
  player: PlayerCardPhotoBatchPlayer
  retry?: BatchError
}

type EditorSource = {
  player: PlayerCardPhotoBatchPlayer
  source: Blob
  sourceEtag: string
}

const DOWNLOAD_ERROR = 'No pudimos descargar la foto original.'
const MISSING_ETAG_ERROR =
  'No se pudo verificar la versión de la foto original.'
const PROCESSING_ERROR = 'No pudimos procesar el recorte automáticamente.'
const SAVING_ERROR = 'El recorte quedó listo, pero no pudimos guardarlo.'
const STALE_SOURCE_ERROR =
  'La foto original cambió. Vuelve a preparar el recorte.'

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export function PlayerCardPhotoBatchProcessor({
  players,
}: {
  players: PlayerCardPhotoBatchPlayer[]
}) {
  const router = useRouter()
  const eligible = useMemo(
    () => players.filter((player) => player.hasPhoto && !player.hasCardPhoto),
    [players],
  )
  const mountedRef = useRef(false)
  const runningRef = useRef(false)
  const pauseRequestedRef = useRef(false)
  const pausedQueueRef = useRef<RunItem[]>([])
  const completedVersionsRef = useRef(new Map<string, string>())
  const errorsRef = useRef(new Map<string, BatchError>())
  const requestControllerRef = useRef<AbortController | null>(null)
  const correctionControllerRef = useRef<AbortController | null>(null)

  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [pauseRequested, setPauseRequested] = useState(false)
  const [runAttempted, setRunAttempted] = useState(0)
  const [runTotal, setRunTotal] = useState(eligible.length)
  const [completedVersions, setCompletedVersions] = useState<Map<string, string>>(
    () => new Map(),
  )
  const [currentName, setCurrentName] = useState('')
  const [errors, setErrors] = useState<BatchError[]>([])
  const [editorSource, setEditorSource] = useState<EditorSource | null>(null)
  const [loadingCorrectionId, setLoadingCorrectionId] = useState<string | null>(
    null,
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      runningRef.current = false
      requestControllerRef.current?.abort()
      correctionControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (running || paused) return
    const currentPlayers = new Map(players.map((player) => [player.id, player]))
    const nextCompleted = new Map(
      Array.from(completedVersionsRef.current).filter(([id, version]) => {
        const player = currentPlayers.get(id)
        return (
          player?.photoVersion === version &&
          player.hasPhoto &&
          !player.hasCardPhoto
        )
      }),
    )
    const nextErrors = new Map(
      Array.from(errorsRef.current).filter(([id, error]) => {
        const player = currentPlayers.get(id)
        return (
          player?.photoVersion === error.version &&
          player.hasPhoto &&
          !player.hasCardPhoto
        )
      }),
    )
    const completedChanged =
      nextCompleted.size !== completedVersionsRef.current.size
    const errorsChanged = nextErrors.size !== errorsRef.current.size
    if (completedChanged) {
      completedVersionsRef.current = nextCompleted
      setCompletedVersions(new Map(nextCompleted))
    }
    if (errorsChanged) {
      errorsRef.current = nextErrors
      setErrors(Array.from(nextErrors.values()))
    }
    if (completedChanged || errorsChanged) {
      setRunAttempted(0)
      setRunTotal(
        players.filter(
          (player) => player.hasPhoto && !player.hasCardPhoto,
        ).length,
      )
    }
  }, [paused, players, running])

  function publishErrors() {
    if (!mountedRef.current) return
    setErrors(Array.from(errorsRef.current.values()))
  }

  function recordError(batchError: BatchError) {
    errorsRef.current.set(batchError.player.id, batchError)
    publishErrors()
  }

  function recordSuccess(player: PlayerCardPhotoBatchPlayer) {
    completedVersionsRef.current.set(player.id, player.photoVersion)
    setCompletedVersions(new Map(completedVersionsRef.current))
    errorsRef.current.delete(player.id)
    publishErrors()
  }

  async function downloadOriginal(
    player: PlayerCardPhotoBatchPlayer,
    signal: AbortSignal,
  ) {
    const response = await fetch(`/api/players/${player.id}/photo`, {
      cache: 'no-store',
      signal,
    })
    if (!response.ok) throw new Error(DOWNLOAD_ERROR)
    const sourceEtag = response.headers.get('etag')
    if (!sourceEtag) throw new Error(MISSING_ETAG_ERROR)
    return {
      source: await response.blob(),
      sourceEtag,
    }
  }

  async function processItem(item: RunItem, signal: AbortSignal) {
    const { player, retry } = item
    let source: Blob | null = null
    let sourceEtag: string
    let processed: Blob

    if (retry?.stage === 'save' && !retry.staleSource) {
      sourceEtag = retry.sourceEtag
      processed = retry.processedBlob
    } else {
      try {
        const downloaded = await downloadOriginal(player, signal)
        source = downloaded.source
        sourceEtag = downloaded.sourceEtag
      } catch (error) {
        if (!mountedRef.current || signal.aborted) return false
        recordError({
          stage: 'download',
          player,
          version: player.photoVersion,
          message: errorMessage(error, DOWNLOAD_ERROR),
        })
        return false
      }
      if (!mountedRef.current || signal.aborted) return false

      try {
        processed = await processPlayerCardPhoto(source)
      } catch (error) {
        if (!mountedRef.current || signal.aborted) return false
        recordError({
          stage: 'process',
          player,
          version: player.photoVersion,
          message: playerCardProcessingErrorMessage(error, PROCESSING_ERROR),
        })
        return false
      }
    }
    if (!mountedRef.current || signal.aborted) return false

    const form = new FormData()
    form.append(
      'photo',
      new File([processed], 'card-photo.png', { type: 'image/png' }),
    )
    try {
      const saved = await fetch(`/api/players/${player.id}/card-photo`, {
        method: 'POST',
        body: form,
        headers: {
          'If-Match': sourceEtag,
          'If-None-Match': '*',
        },
        signal,
      })
      if (!mountedRef.current || signal.aborted) return false
      if (!saved.ok) {
        const staleSource = saved.status === 412
        recordError({
          stage: 'save',
          player,
          version: player.photoVersion,
          message: staleSource ? STALE_SOURCE_ERROR : SAVING_ERROR,
          sourceEtag,
          processedBlob: processed,
          staleSource,
        })
        return false
      }
      if (!mountedRef.current || signal.aborted) return false

      recordSuccess(player)
      return true
    } catch {
      if (!mountedRef.current || signal.aborted) return false
      recordError({
        stage: 'save',
        player,
        version: player.photoVersion,
        message: SAVING_ERROR,
        sourceEtag,
        processedBlob: processed,
        staleSource: false,
      })
      return false
    }
  }

  async function runQueue(queue: RunItem[]) {
    if (runningRef.current || queue.length === 0) return
    runningRef.current = true
    pauseRequestedRef.current = false
    setPauseRequested(false)
    pausedQueueRef.current = []
    setRunning(true)
    setPaused(false)
    const controller = new AbortController()
    requestControllerRef.current = controller
    let savedAny = false

    for (let index = 0; index < queue.length; index += 1) {
      if (!mountedRef.current || controller.signal.aborted) break
      const item = queue[index]!
      setCurrentName(item.player.name)
      const saved = await processItem(item, controller.signal)
      savedAny = savedAny || saved
      if (!mountedRef.current || controller.signal.aborted) break
      setRunAttempted((count) => count + 1)

      if (pauseRequestedRef.current && index < queue.length - 1) {
        pausedQueueRef.current = queue.slice(index + 1)
        setPaused(true)
        break
      }
    }

    if (!mountedRef.current) return
    const didPause = pausedQueueRef.current.length > 0
    runningRef.current = false
    requestControllerRef.current = null
    setRunning(false)
    setPauseRequested(false)
    setCurrentName('')
    if (!didPause && savedAny) router.refresh()
  }

  function start() {
    if (runningRef.current) return
    const queue = eligible
      .filter(
        (player) =>
          completedVersionsRef.current.get(player.id) !==
            player.photoVersion &&
          errorsRef.current.get(player.id)?.version !== player.photoVersion,
      )
      .map((player) => ({ player }))
    setRunAttempted(0)
    setRunTotal(queue.length)
    void runQueue(queue)
  }

  function requestPause() {
    if (!runningRef.current) return
    pauseRequestedRef.current = true
    setPauseRequested(true)
  }

  function resume() {
    if (runningRef.current) return
    const queue = pausedQueueRef.current
    pausedQueueRef.current = []
    void runQueue(queue)
  }

  function retryErrors() {
    if (runningRef.current || paused) return
    const queue = Array.from(errorsRef.current.values()).map((entry) => ({
      player: entry.player,
      retry: entry,
    }))
    setRunAttempted(0)
    setRunTotal(queue.length)
    void runQueue(queue)
  }

  async function openCorrection(batchError: BatchError) {
    if (runningRef.current || loadingCorrectionId) return
    const controller = new AbortController()
    correctionControllerRef.current = controller
    setLoadingCorrectionId(batchError.player.id)
    try {
      const downloaded = await downloadOriginal(
        batchError.player,
        controller.signal,
      )
      if (!mountedRef.current || controller.signal.aborted) return
      setEditorSource({
        player: batchError.player,
        source: downloaded.source,
        sourceEtag: downloaded.sourceEtag,
      })
    } catch {
      if (!mountedRef.current || controller.signal.aborted) return
      recordError({
        stage: 'download',
        player: batchError.player,
        version: batchError.version,
        message: DOWNLOAD_ERROR,
      })
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        correctionControllerRef.current = null
        setLoadingCorrectionId(null)
      }
    }
  }

  function handleManualSaved(playerId: string) {
    if (!mountedRef.current) return
    const player = players.find((candidate) => candidate.id === playerId)
    if (player) recordSuccess(player)
    setEditorSource(null)
    router.refresh()
  }

  const remainingCount = eligible.filter(
    (player) =>
      completedVersions.get(player.id) !== player.photoVersion &&
      !errors.some(
        (error) =>
          error.player.id === player.id &&
          error.version === player.photoVersion,
      ),
  ).length

  return (
    <section className="card-kelme space-y-4 p-4">
      <div>
        <h2 className="font-display text-lg font-bold">Fotos para cartas</h2>
        <p className="mt-1 text-sm leading-6 text-kelme-gray-400">
          El recorte se procesa localmente en este navegador y la foto original
          nunca se reemplaza. La primera ejecución puede tardar mientras se
          descarga el modelo.
        </p>
        <p className="mt-1 text-sm leading-6 text-kelme-gray-400">
          Si cierras esta pestaña, el proceso se detiene; los recortes ya
          guardados permanecen y podrás continuar después.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={running || paused || remainingCount === 0}
          onClick={start}
          className="btn-kelme disabled:opacity-50"
        >
          Preparar fotos para cartas
        </button>
        {running ? (
          <button
            type="button"
            onClick={requestPause}
            disabled={pauseRequested}
            className="btn-kelme-outline disabled:opacity-50"
          >
            Pausar
          </button>
        ) : null}
        {paused ? (
          <button type="button" onClick={resume} className="btn-kelme">
            Continuar
          </button>
        ) : null}
        {errors.length > 0 ? (
          <button
            type="button"
            disabled={running || paused}
            onClick={retryErrors}
            className="btn-kelme-outline disabled:opacity-50"
          >
            Reintentar errores
          </button>
        ) : null}
      </div>

      {eligible.length === 0 ? (
        <p className="text-sm text-kelme-gray-400">
          No hay fotos pendientes de preparar.
        </p>
      ) : (
        <div role="status" aria-live="polite" className="text-sm">
          <span className="font-data font-bold">
            {runAttempted} de {runTotal}
          </span>
          {currentName ? (
            <span className="ml-2 text-kelme-gray-400">
              Procesando {currentName}
            </span>
          ) : paused ? (
            <span className="ml-2 text-kelme-gray-400">Proceso pausado</span>
          ) : null}
        </div>
      )}

      {errors.length > 0 ? (
        <div role="alert" aria-live="assertive" className="space-y-2">
          <h3 className="text-sm font-bold">Fotos con errores</h3>
          <ul className="space-y-2">
            {errors.map((batchError) => (
              <li
                key={batchError.player.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-kelme-border p-3 text-sm"
              >
                <span>
                  <strong>{batchError.player.name}</strong>
                  <span className="ml-2 text-[#ff8f8f]">
                    {batchError.message}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={
                    running || loadingCorrectionId === batchError.player.id
                  }
                  onClick={() => void openCorrection(batchError)}
                  aria-label={`Corregir recorte de ${batchError.player.name}`}
                  className="btn-kelme-outline px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  {loadingCorrectionId === batchError.player.id
                    ? 'Descargando original…'
                    : 'Corregir recorte'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {editorSource ? (
        <PlayerCardPhotoEditorDialog
          playerId={editorSource.player.id}
          playerName={editorSource.player.name}
          source={editorSource.source}
          sourceEtag={editorSource.sourceEtag}
          onClose={() => setEditorSource(null)}
          onSaved={() => handleManualSaved(editorSource.player.id)}
        />
      ) : null}
    </section>
  )
}
