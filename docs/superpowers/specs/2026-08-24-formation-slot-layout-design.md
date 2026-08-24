# Formación — posiciones libres en cancha — Design Spec

> Fecha: 2026-08-24  
> Producto: **LigaLab**  
> Depende de: `MatchFormation`, `FormationEditor`, `FormationPitch`, `buildLineupView`, citación liga / roster amistoso  
> Estado: **Diseño aprobado** (arrastre libre A; layout en `MatchFormation`; GK fijo)

---

## 1. Objetivo

Permitir que el DT (coach/admin) **mueva visualmente** a cada jugador sobre la cancha al armar la formación, sin cambiar el esquema táctico ni el `slotKey`. Ejemplo: un `4-4-2` puede dibujarse como **rombo** en mediocampo si el DT lo requiere.

Hoy las posiciones vienen fijas del catálogo (`formations.ts`: `row` + `col`). Solo se persiste **quién** ocupa cada slot.

---

## 2. Decisiones

| Tema | Elección | Por qué |
|------|----------|---------|
| Interacción | **Arrastre libre** en el editor | Máxima flexibilidad; el usuario lo pidió explícitamente |
| Persistencia | JSON `slotLayout` en `MatchFormation` | Un layout por equipo/lado por partido; live lee lo mismo |
| Coordenadas | `topPct` / `leftPct` (0–100) | Mismo sistema que el render actual (`%` en cancha) |
| Arquero | **No arrastrable** | Evita errores; orientación live consistente |
| Esquema táctico | No cambia al mover | `slotKey` y acierto táctico siguen por rol del slot |
| Cambio de esquema | Reset del layout + aviso | Slots distintos entre esquemas |
| Live / FINISHED | Solo lectura del layout guardado | Editor ya bloquea edición en FINISHED (salvo admin) |

### Alternativas descartadas

1. **Variantes predefinidas** (`4-4-2 línea` vs `rombo`). Menos flexible.
2. **Layout en cada `CallUp` / `FriendlyMatchPlayer`**. Duplicado e inconsistente.
3. **Offsets relativos al default**. Frágil al cambiar esquema.

---

## 3. Alcance

### Incluido

- Campo `slotLayout` en `MatchFormation` (migración Prisma).
- Helpers: resolver posición visual, validar/sanitizar layout, defaults desde catálogo.
- API `PUT/GET /api/matches/[id]/formations` incluye `slotLayout`.
- `buildLineupView` + `FormationPitch` usan overrides.
- `FormationEditor`: toggle **Ajustar posiciones**, drag mouse/touch, **Restaurar posiciones**.
- Wire en `LeagueLineupEditor`, `FriendlyLineupEditor`, `CallUpForm`.
- Tests unitarios (helpers + validación Zod + merge en lineup).

### Excluido (v1)

- Plantillas reutilizables entre partidos.
- Snap a grid / líneas guía.
- Intercambiar jugadores arrastrando entre slots.
- Cambiar acierto táctico según coordenadas visuales.
- Animaciones al mover.

---

## 4. Modelo de datos

```ts
// MatchFormation.slotLayout (Json?, nullable)
type SlotLayout = Record<
  string,
  { topPct: number; leftPct: number }
>
```

- Claves = `slotKey` válidos del esquema guardado (excepto `GK`).
- Si `null` o falta clave → posición default del catálogo.
- Rango validado: `5 ≤ topPct, leftPct ≤ 95` (margen dentro del rectángulo de juego).

---

## 5. API

### PUT body (extensión)

```ts
{
  scheme: string
  teamId?: string
  side?: 'A' | 'B'
  slots: { slotKey: string; playerId: string }[]
  benchPlayerIds?: string[]
  slotLayout?: SlotLayout | null  // null = reset a defaults
}
```

### GET response

Cada side en `buildMatchFormationSides` expone `slotLayout` junto al `lineup` (o dentro del objeto formation metadata que ya consume el editor).

Validación:

- Claves ⊆ slots del `scheme` + `footballFormat`.
- Ignorar / rechazar `GK` si viene.
- Números finitos en rango.

---

## 6. UX — Editor

1. Toggle **「Ajustar posiciones」** junto al selector de esquema.
2. Modo activo:
   - Arrastrar círculos (excepto GK).
   - Clic en slot para asignar jugador **deshabilitado** mientras se arrastra (o: clic corto asigna, drag mueve — implementación: drag con umbral de píxeles).
3. Botón **「Restaurar posiciones」** → `slotLayout = {}` local hasta guardar.
4. Al cambiar esquema: confirmación *「Cambiar esquema restablece las posiciones en cancha」* → reset layout.
5. Guardar envía `scheme`, `slots`, `benchPlayerIds`, `slotLayout`.

Copy en español chileno (`es-CL`).

---

## 7. Render (editor + live)

```
posición final = slotLayout[slotKey] ?? defaultFromCatalog(row, col)
```

- `FormationPitch`: recibe `lineup.pitch[].topPct` / `leftPct` ya resueltos (preferible resolver en `buildLineupView`).
- Live hereda automáticamente vía `match-formations` → `buildLineupView`.

---

## 8. Acierto táctico

Sin cambio: `formation-position-fit.ts` usa **slotKey** + posición natural del jugador. Mover en cancha no altera el score de fit.

---

## 9. Pitfalls

- No mezclar modo asignar-jugador y drag sin umbral — evita clicks accidentales al soltar.
- Al cambiar esquema, invalidar claves de layout que ya no existen.
- Prisma `Json` en prod: migración manual vía Supabase CLI si el deploy no corre migrate.
- Touch: `pointer-events` + `touch-action: none` en marcadores en modo layout.

---

## 10. Spec coverage checklist

| Requisito | Sección |
|-----------|---------|
| Arrastre libre | §2, §6 |
| Persistencia por partido/equipo | §4, §5 |
| GK fijo | §2, §4 |
| Live refleja layout | §7 |
| Reset al cambiar esquema | §2, §6 |
| Fuera de alcance v1 | §3 |
