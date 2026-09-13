# Player Card Persistent FIFA Photo Cutout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Procesar localmente las fotos de jugadores una sola vez, persistir un recorte transparente y usarlo en la carta web y el PNG compartido.

**Architecture:** La foto original sigue siendo la fuente inmutable en `Person.photoData`; un nuevo derivado `cardPhotoData` guarda el PNG ya recortado y encuadrado. El navegador autenticado ejecuta IMG.LY, normaliza el sujeto en un canvas transparente y sube el resultado a una API protegida. La carta pública consume una ruta de imagen que prefiere el derivado y cae a la foto original.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7/PostgreSQL, `@imgly/background-removal`, Canvas API, Sharp, Vitest.

---

## File map

- `prisma/schema.prisma`: campos del derivado en `Person`.
- `prisma/migrations/20260913040000_person_card_photo/migration.sql`: migración aditiva.
- `src/lib/player-card-photo.ts`: validación, detección de derivado y URL pública.
- `src/lib/player-card-photo-process.ts`: procesamiento cliente y geometría pura.
- `src/app/api/players/[id]/card-photo/route.ts`: lectura pública y escritura autorizada.
- `src/app/api/players/[id]/photo/route.ts`: invalida el derivado al cambiar el original.
- `src/components/admin/PlayerCardPhotoEditorDialog.tsx`: vista previa y corrección de encuadre.
- `src/components/admin/PlayerCardPhotoBatchProcessor.tsx`: lote secuencial para fotos existentes.
- `src/components/admin/FriendlyPlayerPhotoUpload.tsx`: procesa nuevas fotos.
- `src/components/admin/FriendlyPlayersTable.tsx`: expone estado y acciones del recorte.
- `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/players/page.tsx`: entrega datos del lote.
- `src/components/player-card/PlayerCardPhoto.tsx`: render público sin inferencia de IA.
- `src/lib/player-card-query.ts`: usa la URL persistente.
- `src/components/player-card/PlayerCardOgImage.tsx`: mismo derivado en Open Graph.
- `src/lib/player-card-photo-cutout.ts`: eliminar al migrar al procesador persistente.
- `tests/lib/player-card-photo.test.ts`: validación y helpers.
- `tests/lib/player-card-photo-process.test.ts`: bounds y encuadre.
- `tests/api/player-card-photo-route.test.ts`: contrato GET/POST.
- `tests/lib/proxy-policy.test.ts`: acceso público solo a GET.

---

### Task 1: Persistencia del recorte de carta

**Files:**
- Modify: `prisma/schema.prisma:175-186`
- Create: `prisma/migrations/20260913040000_person_card_photo/migration.sql`
- Create: `src/lib/player-card-photo.ts`
- Create: `tests/lib/player-card-photo.test.ts`

- [ ] **Step 1: Escribir tests fallando para estado y URL del recorte**

```ts
import { describe, expect, it } from 'vitest'
import {
  personHasCardPhoto,
  playerCardPhotoUrl,
} from '@/lib/player-card-photo'

describe('player card photo helpers', () => {
  it('detecta un recorte persistido', () => {
    expect(
      personHasCardPhoto({
        cardPhotoMimeType: 'image/png',
        cardPhotoData: Buffer.from('png'),
      }),
    ).toBe(true)
  })

  it('rechaza campos incompletos', () => {
    expect(
      personHasCardPhoto({
        cardPhotoMimeType: 'image/png',
        cardPhotoData: null,
      }),
    ).toBe(false)
  })

  it('construye URL versionada', () => {
    expect(playerCardPhotoUrl('p1', 123)).toBe('/api/players/p1/card-photo?v=123')
  })
})
```

- [ ] **Step 2: Ejecutar el test y comprobar RED**

Run: `npx vitest run tests/lib/player-card-photo.test.ts`

Expected: FAIL porque `@/lib/player-card-photo` no existe.

- [ ] **Step 3: Agregar campos Prisma y migración**

En `Person`:

```prisma
cardPhotoMimeType String?
cardPhotoData     Bytes?
cardPhotoUpdatedAt DateTime?
```

Migración:

```sql
ALTER TABLE "Person"
  ADD COLUMN "cardPhotoMimeType" TEXT,
  ADD COLUMN "cardPhotoData" BYTEA,
  ADD COLUMN "cardPhotoUpdatedAt" TIMESTAMP(3);
```

- [ ] **Step 4: Implementar helpers mínimos**

```ts
export const CARD_PHOTO_WIDTH = 720
export const CARD_PHOTO_HEIGHT = 900
export const MAX_CARD_PHOTO_BYTES = 2 * 1024 * 1024

export function personHasCardPhoto(person: {
  cardPhotoMimeType: string | null
  cardPhotoData: Uint8Array | Buffer | null
}): boolean {
  return Boolean(
    person.cardPhotoMimeType === 'image/png' &&
      person.cardPhotoData &&
      person.cardPhotoData.byteLength > 0,
  )
}

export function playerCardPhotoUrl(
  playerId: string,
  cacheKey?: string | number | Date | null,
): string {
  const base = `/api/players/${playerId}/card-photo`
  if (cacheKey == null) return base
  const value = cacheKey instanceof Date ? cacheKey.getTime() : cacheKey
  return `${base}?v=${encodeURIComponent(String(value))}`
}
```

- [ ] **Step 5: Generar Prisma Client y comprobar GREEN**

Run:

```powershell
npx prisma generate
npx vitest run tests/lib/player-card-photo.test.ts
```

Expected: Prisma genera el cliente y 3 tests pasan.

- [ ] **Step 6: Commit**

```powershell
git add prisma/schema.prisma prisma/migrations/20260913040000_person_card_photo/migration.sql src/lib/player-card-photo.ts tests/lib/player-card-photo.test.ts
git commit -m "feat: persist processed player card photos"
```

---

### Task 2: API pública y escritura protegida

**Files:**
- Create: `src/app/api/players/[id]/card-photo/route.ts`
- Modify: `src/app/api/players/[id]/photo/route.ts:9-80`
- Modify: `src/lib/player-card-photo.ts`
- Modify: `src/lib/proxy-policy.ts:40-90`
- Create: `tests/api/player-card-photo-route.test.ts`
- Modify: `tests/lib/proxy-policy.test.ts:163-172`
- Modify: `tests/lib/friendly-player-photo.test.ts`

- [ ] **Step 1: Escribir tests fallando del contrato de API**

Mockear `db`, `requirePlayerPhotoMutation`, `sharp` y revalidación. El mock de Sharp debe exponer metadata controlable:

```ts
const sharpMetadata = vi.fn()
vi.mock('sharp', () => ({
  default: vi.fn(() => ({ metadata: sharpMetadata })),
}))
```

Cubrir:

```ts
it('GET prefiere el recorte persistido', async () => {
  vi.mocked(db.player.findUnique).mockResolvedValue({
    person: {
      cardPhotoMimeType: 'image/png',
      cardPhotoData: Buffer.from('cutout'),
      cardPhotoUpdatedAt: new Date('2026-09-13T04:00:00Z'),
      photoMimeType: 'image/jpeg',
      photoData: Buffer.from('original'),
    },
  } as never)

  const response = await GET(new Request('http://localhost/api/players/p1/card-photo'), {
    params: Promise.resolve({ id: 'p1' }),
  })

  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('image/png')
  expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('cutout')
})

it('GET cae a la foto original', async () => {
  vi.mocked(db.player.findUnique).mockResolvedValue({
    person: {
      cardPhotoMimeType: null,
      cardPhotoData: null,
      cardPhotoUpdatedAt: null,
      photoMimeType: 'image/jpeg',
      photoData: Buffer.from('original'),
    },
  } as never)
  // esperar image/jpeg y bytes "original"
})

it('POST rechaza un PNG sin transparencia', async () => {
  vi.mocked(requirePlayerPhotoMutation).mockResolvedValue({
    player: { personId: 'person-1', organizationId: 'org-1' },
  } as never)
  vi.mocked(sharpMetadata).mockResolvedValue({
    format: 'png',
    width: 720,
    height: 900,
    hasAlpha: false,
  })
  // esperar 400 y "El recorte debe tener fondo transparente."
})
```

Agregar test de autorización delegada: si `requirePlayerPhotoMutation` devuelve error, `POST` retorna ese mismo status.

- [ ] **Step 2: Ejecutar tests y comprobar RED**

Run:

```powershell
npx vitest run tests/api/player-card-photo-route.test.ts tests/lib/proxy-policy.test.ts
```

Expected: FAIL porque la ruta y la política aún no existen.

- [ ] **Step 3: Mover Sharp a dependencias de runtime**

Run: `npm install sharp`

Expected: `sharp` queda bajo `dependencies` y `package-lock.json` se actualiza.

- [ ] **Step 4: Implementar validación real del PNG**

Agregar a `src/lib/player-card-photo.ts`:

```ts
import sharp from 'sharp'

export async function validateProcessedCardPhoto(
  buffer: Buffer,
  mimeType: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (mimeType !== 'image/png') {
    return { ok: false, error: 'El recorte debe ser PNG.' }
  }
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_CARD_PHOTO_BYTES) {
    return { ok: false, error: 'El recorte no puede superar 2 MB.' }
  }
  try {
    const metadata = await sharp(buffer).metadata()
    if (metadata.format !== 'png') {
      return { ok: false, error: 'El archivo no es un PNG válido.' }
    }
    if (!metadata.hasAlpha) {
      return { ok: false, error: 'El recorte debe tener fondo transparente.' }
    }
    if (
      metadata.width !== CARD_PHOTO_WIDTH ||
      metadata.height !== CARD_PHOTO_HEIGHT
    ) {
      return {
        ok: false,
        error: `El recorte debe medir ${CARD_PHOTO_WIDTH}×${CARD_PHOTO_HEIGHT} px.`,
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'El archivo no es una imagen válida.' }
  }
}
```

- [ ] **Step 5: Implementar `card-photo` GET/POST**

GET selecciona original y derivado, prefiere derivado y responde:

```ts
return new NextResponse(data, {
  headers: {
    'Content-Type': mimeType,
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    ETag: `"${updatedAt?.getTime() ?? 'original'}"`,
  },
})
```

POST:

```ts
const access = await requirePlayerPhotoMutation(id)
if ('error' in access) return access.error

const form = await req.formData()
const file = form.get('photo')
if (!(file instanceof File)) {
  return NextResponse.json({ error: 'Debes enviar un archivo photo' }, { status: 400 })
}

const buffer = Buffer.from(await file.arrayBuffer())
const validation = await validateProcessedCardPhoto(buffer, file.type)
if (!validation.ok) {
  return NextResponse.json({ error: validation.error }, { status: 400 })
}

const updatedAt = new Date()
await db.person.update({
  where: { id: access.player.personId },
  data: {
    cardPhotoMimeType: 'image/png',
    cardPhotoData: buffer,
    cardPhotoUpdatedAt: updatedAt,
  },
})
await revalidateOrgAdminRosterPages(access.player.organizationId)
return NextResponse.json({ ok: true, updatedAt: updatedAt.toISOString() })
```

- [ ] **Step 6: Invalidar derivado al cambiar original**

En POST de `/photo`, guardar:

```ts
data: {
  photoMimeType: mimeType,
  photoData: buffer,
  cardPhotoMimeType: null,
  cardPhotoData: null,
  cardPhotoUpdatedAt: null,
}
```

En DELETE, limpiar los seis campos.

- [ ] **Step 7: Hacer público solo GET/HEAD de card-photo**

En `isPublicRequest`:

```ts
const isPlayerCardPhotoGet =
  (method === 'GET' || method === 'HEAD') &&
  /^\/api\/players\/[^/]+\/card-photo$/.test(pathname)
```

Agregarlo al `return`, y tests:

```ts
expect(isPublicRequest('GET', '/api/players/player-1/card-photo')).toBe(true)
expect(isPublicRequest('HEAD', '/api/players/player-1/card-photo')).toBe(true)
expect(isPublicRequest('POST', '/api/players/player-1/card-photo')).toBe(false)
```

- [ ] **Step 8: Ejecutar tests y comprobar GREEN**

Run:

```powershell
npx vitest run tests/api/player-card-photo-route.test.ts tests/lib/proxy-policy.test.ts tests/lib/friendly-player-photo.test.ts tests/lib/player-photo-access.test.ts
```

Expected: todos pasan.

- [ ] **Step 9: Commit**

```powershell
git add package.json package-lock.json src/app/api/players/[id]/card-photo/route.ts src/app/api/players/[id]/photo/route.ts src/lib/player-card-photo.ts src/lib/proxy-policy.ts tests/api/player-card-photo-route.test.ts tests/lib/proxy-policy.test.ts tests/lib/friendly-player-photo.test.ts
git commit -m "feat: add persistent card photo API"
```

---

### Task 3: Procesador local determinista

**Files:**
- Create: `src/lib/player-card-photo-process.ts`
- Create: `tests/lib/player-card-photo-process.test.ts`
- Delete after migration: `src/lib/player-card-photo-cutout.ts`

- [ ] **Step 1: Escribir tests fallando para bounds y placement**

```ts
import { describe, expect, it } from 'vitest'
import {
  findAlphaBounds,
  calculateCardPhotoPlacement,
} from '@/lib/player-card-photo-process'

describe('findAlphaBounds', () => {
  it('ignora píxeles transparentes', () => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4)
    rgba[(1 * 4 + 1) * 4 + 3] = 255
    rgba[(2 * 4 + 2) * 4 + 3] = 255
    expect(findAlphaBounds(rgba, 4, 4)).toEqual({
      x: 1,
      y: 1,
      width: 2,
      height: 2,
    })
  })
})

describe('calculateCardPhotoPlacement', () => {
  it('encaja el sujeto en 720×900 y lo ancla abajo', () => {
    expect(
      calculateCardPhotoPlacement(
        { x: 10, y: 20, width: 400, height: 600 },
        { offsetX: 0, offsetY: 0, scale: 1 },
      ),
    ).toEqual({
      source: { x: 10, y: 20, width: 400, height: 600 },
      destination: { x: 60, y: 0, width: 600, height: 900 },
    })
  })
})
```

- [ ] **Step 2: Ejecutar test y comprobar RED**

Run: `npx vitest run tests/lib/player-card-photo-process.test.ts`

Expected: FAIL porque el módulo no existe.

- [ ] **Step 3: Implementar helpers puros**

```ts
export type CardPhotoAdjustments = {
  offsetX: number
  offsetY: number
  scale: number
}

export function findAlphaBounds(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 12,
) {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3]! < threshold) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (maxX < minX || maxY < minY) return null
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}
```

`calculateCardPhotoPlacement` debe usar 720×900, un margen horizontal de 60 px, anclaje inferior y ajustes expresados como fracción del lienzo.

- [ ] **Step 4: Implementar extracción y composición del Blob**

```ts
export async function extractPlayerCutout(source: Blob): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal')
  return removeBackground(source, {
    model: 'isnet_quint8',
    output: { format: 'image/png' },
  })
}

export async function composePlayerCardPhoto(
  cutout: Blob,
  adjustments: CardPhotoAdjustments = {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  },
): Promise<Blob> {
  const bitmap = await createImageBitmap(cutout)
  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = bitmap.width
  sourceCanvas.height = bitmap.height
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })
  if (!sourceCtx) throw new Error('Tu navegador no permite procesar esta foto.')
  sourceCtx.drawImage(bitmap, 0, 0)
  const rgba = sourceCtx.getImageData(0, 0, bitmap.width, bitmap.height)
  const bounds = findAlphaBounds(rgba.data, bitmap.width, bitmap.height)
  if (!bounds) throw new Error('No se detectó una persona en la foto.')

  const output = document.createElement('canvas')
  output.width = CARD_PHOTO_WIDTH
  output.height = CARD_PHOTO_HEIGHT
  const outputCtx = output.getContext('2d')
  if (!outputCtx) throw new Error('Tu navegador no permite generar el recorte.')
  const placement = calculateCardPhotoPlacement(bounds, adjustments)
  outputCtx.filter = 'brightness(1.04) contrast(1.05) saturate(1.03)'
  outputCtx.drawImage(
    sourceCanvas,
    placement.source.x,
    placement.source.y,
    placement.source.width,
    placement.source.height,
    placement.destination.x,
    placement.destination.y,
    placement.destination.width,
    placement.destination.height,
  )
  return new Promise((resolve, reject) => {
    output.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo exportar el recorte.'))),
      'image/png',
    )
  })
}

export async function processPlayerCardPhoto(
  source: Blob,
  adjustments?: CardPhotoAdjustments,
): Promise<Blob> {
  const cutout = await extractPlayerCutout(source)
  return composePlayerCardPhoto(cutout, adjustments)
}
```

Importar dimensiones desde `src/lib/player-card-photo.ts`.

- [ ] **Step 5: Ejecutar test y comprobar GREEN**

Run: `npx vitest run tests/lib/player-card-photo-process.test.ts`

Expected: tests de geometría pasan sin cargar ONNX.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/player-card-photo-process.ts tests/lib/player-card-photo-process.test.ts
git commit -m "feat: normalize player cutouts for FIFA cards"
```

---

### Task 4: Editor de recorte con vista previa

**Files:**
- Create: `src/components/admin/PlayerCardPhotoEditorDialog.tsx`
- Modify: `src/components/admin/FriendlyPlayerPhotoUpload.tsx`
- Test: `tests/components/player-card-photo-editor.test.tsx`

- [ ] **Step 1: Escribir test de interacción fallando**

Con `@vitest-environment jsdom`, mockear extracción y composición:

```tsx
it('procesa, permite ajustar y guarda el PNG', async () => {
  vi.mocked(extractPlayerCutout).mockResolvedValue(
    new Blob(['cutout'], { type: 'image/png' }),
  )
  vi.mocked(composePlayerCardPhoto).mockResolvedValue(
    new Blob(['png'], { type: 'image/png' }),
  )
  render(
    <PlayerCardPhotoEditorDialog
      playerId="p1"
      playerName="Rodrigo Olave"
      source={new Blob(['jpeg'], { type: 'image/jpeg' })}
      onClose={vi.fn()}
      onSaved={onSaved}
    />,
  )

  await screen.findByAltText('Recorte de Rodrigo Olave')
  fireEvent.change(screen.getByLabelText('Tamaño'), {
    target: { value: '1.1' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar recorte' }))

  await waitFor(() => expect(onSaved).toHaveBeenCalled())
  expect(fetch).toHaveBeenCalledWith(
    '/api/players/p1/card-photo',
    expect.objectContaining({ method: 'POST' }),
  )
})
```

- [ ] **Step 2: Ejecutar test y comprobar RED**

Run: `npx vitest run tests/components/player-card-photo-editor.test.tsx`

Expected: FAIL porque el diálogo no existe.

- [ ] **Step 3: Implementar diálogo**

Estados:

```ts
const [adjustments, setAdjustments] = useState({
  offsetX: 0,
  offsetY: 0,
  scale: 1,
})
const [previewUrl, setPreviewUrl] = useState<string | null>(null)
const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)
const [status, setStatus] = useState<'processing' | 'ready' | 'saving' | 'error'>('processing')
```

La apertura ejecuta `extractPlayerCutout(source)` una sola vez. Cada cambio de control llama solo a `composePlayerCardPhoto(cutout, adjustments)` con debounce de 250 ms. Controles:

```tsx
<input aria-label="Mover horizontalmente" type="range" min="-0.2" max="0.2" step="0.01" />
<input aria-label="Mover verticalmente" type="range" min="-0.2" max="0.2" step="0.01" />
<input aria-label="Tamaño" type="range" min="0.8" max="1.35" step="0.01" />
```

Vista previa:

```tsx
<div className="relative mx-auto aspect-[270/400] w-[270px] overflow-hidden rounded-[40px] bg-[#10251b]">
  {previewUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={previewUrl}
      alt={`Recorte de ${playerName}`}
      className="absolute inset-0 h-full w-full object-contain object-bottom"
    />
  ) : null}
</div>
```

Guardar crea `FormData`, agrega `photo` como `new File([processedBlob], 'card-photo.png', { type: 'image/png' })`, hace POST y conserva preview si la red falla.

- [ ] **Step 4: Integrar nueva foto con el diálogo**

En `FriendlyPlayerPhotoUpload.upload`:

1. subir original;
2. actualizar avatar;
3. guardar `file` en `sourceForCard`;
4. abrir el editor.

```ts
setSourceForCard(file)
setEditorOpen(true)
```

Renderizar el diálogo con `onSaved` que limpia source, cierra y hace `router.refresh()`.

- [ ] **Step 5: Ejecutar test y comprobar GREEN**

Run:

```powershell
npx vitest run tests/components/player-card-photo-editor.test.tsx tests/lib/friendly-player-photo.test.ts
```

Expected: tests pasan.

- [ ] **Step 6: Commit**

```powershell
git add src/components/admin/PlayerCardPhotoEditorDialog.tsx src/components/admin/FriendlyPlayerPhotoUpload.tsx tests/components/player-card-photo-editor.test.tsx
git commit -m "feat: preview and save player card cutouts"
```

---

### Task 5: Procesamiento en lote de fotos existentes

**Files:**
- Create: `src/components/admin/PlayerCardPhotoBatchProcessor.tsx`
- Modify: `src/components/admin/FriendlyPlayersTable.tsx:19-44`
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/players/page.tsx:29-126`
- Create: `tests/components/player-card-photo-batch.test.tsx`

- [ ] **Step 1: Escribir test fallando del lote secuencial**

```tsx
it('procesa solo jugadores con original y sin recorte', async () => {
  render(
    <PlayerCardPhotoBatchProcessor
      players={[
        { id: 'p1', name: 'Rodrigo Olave', hasPhoto: true, hasCardPhoto: false },
        { id: 'p2', name: 'Fernando Opitz', hasPhoto: true, hasCardPhoto: true },
        { id: 'p3', name: 'Sin Foto', hasPhoto: false, hasCardPhoto: false },
      ]}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Preparar fotos para cartas' }))
  await screen.findByText('1 de 1')
  expect(processPlayerCardPhoto).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledWith('/api/players/p1/photo')
})
```

Agregar otro test donde `p1` falla y `p2` igualmente se procesa.

- [ ] **Step 2: Ejecutar test y comprobar RED**

Run: `npx vitest run tests/components/player-card-photo-batch.test.tsx`

Expected: FAIL porque el componente no existe.

- [ ] **Step 3: Exponer `hasCardPhoto` en el DTO**

En el server page:

```ts
hasPhoto: Boolean(player.person.photoMimeType),
hasCardPhoto: Boolean(
  player.person.cardPhotoMimeType && player.person.cardPhotoData,
),
```

En `FriendlyPlayerRow`:

```ts
hasCardPhoto: boolean
```

- [ ] **Step 4: Implementar lote secuencial y pausable**

Filtrar:

```ts
const pending = players.filter((player) => player.hasPhoto && !player.hasCardPhoto)
```

Para cada jugador:

```ts
const original = await fetch(`/api/players/${player.id}/photo`)
if (!original.ok) throw new Error('No se pudo descargar la foto original.')
const source = await original.blob()
const processed = await processPlayerCardPhoto(source)
const form = new FormData()
form.append('photo', new File([processed], 'card-photo.png', { type: 'image/png' }))
const saved = await fetch(`/api/players/${player.id}/card-photo`, {
  method: 'POST',
  body: form,
})
if (!saved.ok) throw new Error('No se pudo guardar el recorte.')
```

Mantener `completedIds`, `errors`, `currentName`, `pausedRef`; continuar al siguiente después de error. Mostrar **Pausar**, **Continuar** y **Reintentar errores**.

Cada fila fallida conserva el Blob original mientras la pestaña siga abierta y muestra **Corregir recorte**. Ese botón abre `PlayerCardPhotoEditorDialog` con el original; al guardar, quita el jugador de la lista de errores.

- [ ] **Step 5: Mostrar lote solo para Los Lunes**

Pasar `organizationSlug` a `FriendlyPlayersTable` y renderizar:

```tsx
{organizationSlug === LOSLUNES_SLUG ? (
  <PlayerCardPhotoBatchProcessor
    players={players.map((player) => ({
      id: player.id,
      name: `${player.firstName} ${player.lastName}`.trim(),
      hasPhoto: player.hasPhoto,
      hasCardPhoto: player.hasCardPhoto,
    }))}
  />
) : null}
```

- [ ] **Step 6: Ejecutar test y comprobar GREEN**

Run: `npx vitest run tests/components/player-card-photo-batch.test.tsx`

Expected: ambos tests pasan.

- [ ] **Step 7: Commit**

```powershell
git add src/components/admin/PlayerCardPhotoBatchProcessor.tsx src/components/admin/FriendlyPlayersTable.tsx "src/app/(tenant)/[organizationSlug]/(dashboard)/admin/players/page.tsx" tests/components/player-card-photo-batch.test.tsx
git commit -m "feat: batch prepare existing FIFA card photos"
```

---

### Task 6: Carta y OG usan el derivado persistente

**Files:**
- Modify: `src/lib/player-card-query.ts:27-60,145-182`
- Modify: `src/components/player-card/PlayerCardPhoto.tsx`
- Modify: `src/components/player-card/PlayerCard.tsx:123-145`
- Modify: `src/components/player-card/PlayerCardOgImage.tsx`
- Delete: `src/lib/player-card-photo-cutout.ts`
- Modify: `tests/api/player-card-route.test.ts`

- [ ] **Step 1: Actualizar test de payload para exigir `card-photo`**

En `tests/api/player-card-route.test.ts`:

```ts
expect(await res.json()).toMatchObject({
  player: {
    id: 'p1',
    fotoUrl: '/api/players/p1/card-photo',
  },
})
```

- [ ] **Step 2: Ejecutar test y comprobar RED**

Run: `npx vitest run tests/api/player-card-route.test.ts`

Expected: FAIL porque la query aún entrega `/photo`.

- [ ] **Step 3: Cambiar URL de la carta**

En `getLosLunesPlayerCard`:

```ts
fotoUrl: playerCardPhotoUrl(playerId, player.person.cardPhotoUpdatedAt),
```

Importar `playerCardPhotoUrl` y asegurarse de seleccionar `cardPhotoUpdatedAt`.

- [ ] **Step 4: Simplificar `PlayerCardPhoto`**

Eliminar estado de inferencia, `useEffect` e import de `player-card-photo-cutout`. Mantener solo error de carga:

```tsx
'use client'

import { useState } from 'react'

export function PlayerCardPhoto({ fotoUrl, alt, initials }: Props) {
  const [failed, setFailed] = useState(false)
  if (failed) return <InitialsFallback initials={initials} isShield />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fotoUrl}
      alt={alt}
      className="relative z-[1] h-[270px] w-auto max-w-none select-none object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.72)]"
      onError={() => setFailed(true)}
    />
  )
}
```

Eliminar `src/lib/player-card-photo-cutout.ts`.

- [ ] **Step 5: Ajustar composición para cabeza y hombros**

En `PlayerCard.tsx`, mantener al sujeto detrás de la franja de nombre:

```tsx
<div
  className="pointer-events-none absolute z-[1] flex items-end justify-center overflow-hidden"
  style={{
    left: `${w * 0.2}px`,
    top: `${h * 0.015}px`,
    width: `${w * 0.8}px`,
    height: `${h * 0.565}px`,
  }}
>
```

Verificar que el `z-index` del nombre sea mayor y que el recorte no tape posición ni escudo.

- [ ] **Step 6: Alinear OG**

`PlayerCardOgImage` ya recibe `fotoUrl`; al venir de `card-photo` usa el derivado. Cambiar la imagen a:

```tsx
<img
  src={fotoUrl}
  alt=""
  width={Math.round(w * 0.78)}
  height={Math.round(h * 0.55)}
  style={{ objectFit: 'contain', objectPosition: 'center bottom' }}
/>
```

- [ ] **Step 7: Ejecutar tests y typecheck**

Run:

```powershell
npx vitest run tests/api/player-card-route.test.ts tests/lib/player-card-photo.test.ts tests/lib/player-card-photo-process.test.ts
npx tsc --noEmit
```

Expected: tests y typecheck pasan.

- [ ] **Step 8: Commit**

```powershell
git add src/lib/player-card-query.ts src/components/player-card/PlayerCardPhoto.tsx src/components/player-card/PlayerCard.tsx src/components/player-card/PlayerCardOgImage.tsx src/lib/player-card-photo-cutout.ts tests/api/player-card-route.test.ts
git commit -m "feat: serve persistent FIFA cutouts on player cards"
```

---

### Task 7: Verificación integral y despliegue

**Files:**
- Modify: `docs/handoff/SESSION-CONTEXT.md`

- [ ] **Step 1: Ejecutar suite relacionada**

```powershell
npx vitest run tests/lib/player-card-photo.test.ts tests/lib/player-card-photo-process.test.ts tests/api/player-card-photo-route.test.ts tests/api/player-card-route.test.ts tests/lib/proxy-policy.test.ts tests/lib/friendly-player-photo.test.ts tests/lib/player-photo-access.test.ts tests/components/player-card-photo-editor.test.tsx tests/components/player-card-photo-batch.test.tsx
```

Expected: todos los archivos y tests pasan.

- [ ] **Step 2: Ejecutar verificación de producción local**

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

Expected: TypeScript, ESLint y build pasan. Si el build local no tiene variables válidas, usar el entorno de Preview/Vercel para confirmar la compilación sin alterar secretos.

- [ ] **Step 3: Aplicar migración en Preview**

Run: `npx prisma migrate deploy`

Expected: `20260913040000_person_card_photo` aplicada una vez.

- [ ] **Step 4: Revisión visual en Preview**

Abrir:

- `/loslunes/jugador/cm92624634c9f14665bb0cc5c` (Fernando Opitz)
- `/loslunes/jugador/cm1bb177a51789446689d7171` (Rodrigo Olave)
- `/loslunes/admin/players`

Confirmar:

- no hay rectángulo de fondo;
- cabeza completa y hombros visibles;
- el nombre y las insignias no quedan tapados;
- cambiar una foto invalida el derivado;
- el lote continúa después de un error;
- el PNG `/og` usa el mismo recorte.

- [ ] **Step 5: Preparar el commit de documentación**

Actualizar `SESSION-CONTEXT.md` con migración, endpoints, flujo admin y pitfalls. No incluir archivos WIP ajenos a esta feature.

```powershell
git add docs/handoff/SESSION-CONTEXT.md
git commit -m "docs: record persistent FIFA card photo workflow"
```

- [ ] **Step 6: Producción solo con autorización explícita**

Después de aprobación del usuario:

```powershell
git push origin main
npx prisma migrate deploy
npx vercel deploy --prod
```

Expected: push exitoso, migración aplicada y deployment `READY` aliasado a `https://ligalab.cl`.

- [ ] **Step 7: Procesar fotos actuales**

En `https://ligalab.cl/loslunes/admin/players`, usar **Preparar fotos para cartas**, mantener la pestaña abierta hasta completar y revisar manualmente los errores.

- [ ] **Step 8: Verificación final**

Comprobar las cartas y `/og` de Opitz y Olave. Confirmar que ningún visitante descarga el modelo ONNX revisando Network: no deben aparecer solicitudes a recursos de IMG.LY al abrir una carta pública.
