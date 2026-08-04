# Convocatoria y equipos en partidos amistosos — Design Spec

> Estado: **Aprobado** (2026-08-04)  
> Alcance: creación (wizard 2 pasos) + edición (mismo UI, una pantalla)

---

## 1. Objetivo

Mejorar la UX de armado de planteles en partidos amistosos:

1. **Convocar primero** — seleccionar jugadores en una lista única.
2. **Repartir después** — asignar cada convocado a lado A o B con un control simple.
3. **Cambiar de equipo fácilmente** — en creación (paso 2) y en edición.

Capitán y DT siguen siendo **obligatorios antes de guardar** (crear o editar).

Sin cambios de schema ni API: `POST/PUT /api/matches` mantienen `players[]` con `side`, `isCaptain`, `isCoach`.

---

## 2. Flujo de creación (wizard)

### Paso 1 — Convocatoria

- Campos del partido: categoría, formato, nombres A/B, árbitro, fecha, hora, cancha, ubicación, eventos árbitro.
- Sección **Convocados**: lista única con buscador y checkboxes (jugadores de la categoría).
- **Avanzar** requiere ≥2 convocados.
- Cambiar categoría limpia convocados y asignaciones.

### Paso 2 — Equipos

- Tabla solo con convocados del paso 1.
- Por fila: avatar, nombre, posición, control segmentado **A | B**.
- Reparto inicial al entrar al paso 2: orden alfabético por apellido+nombre; primera mitad → A, resto → B (solo si aún no hay asignaciones).
- Selects de capitán y DT por equipo (jugadores del lado correspondiente).
- Validación al crear: ≥1 jugador por lado, capitán y DT en ambos equipos.
- **Volver** conserva convocatoria y asignaciones actuales.

Indicador visual: `1. Convocatoria → 2. Equipos`.

---

## 3. Flujo de edición

Misma lógica de datos, **sin wizard** (todo en una pantalla al editar):

1. **Convocados** — agregar o quitar jugadores (checkboxes + buscador).
2. **Equipos** — `FriendlyMatchTeamAssigner` con selector A/B, capitán y DT.

Al quitar un convocado se limpia su lado y roles (capitán/DT si aplicaba).

---

## 4. Componentes

| Componente | Responsabilidad |
|------------|-----------------|
| `FriendlyMatchConvocationPicker` | Lista única, buscador, multi-select |
| `FriendlyMatchTeamAssigner` | Tabla convocados + A/B + capitán/DT |
| `friendly-match-roster-ui.ts` | Helpers puros: reparto inicial, cambio de lado, payload |
| `FriendlyMatchForm` | Wizard 2 pasos (crear) |
| `MatchActions` | Convocatoria + equipos (editar) |

`FriendlyMatchRosterEditor` se reemplaza en create/edit. Helpers exportados (`rosterEntriesFromSets`, `setsFromPlayerSides`) migran a `friendly-match-roster-ui.ts` o se reexportan desde el módulo lib.

---

## 5. Helpers (lib)

```ts
// Reparto inicial alfabético mitad/mitad
initialSideSplit(players: { id: string; lastName: string; firstName: string }[]): Map<string, 'A' | 'B'>

// Cambiar lado de un jugador; limpia capitán/DT si el id ya no calza
setPlayerSide(...): { sideAIds, sideBIds, captains, coaches }

// Convocados + sets → payload API (reutiliza lógica actual)
rosterEntriesFromSets(...)

// playerSides del match → estado UI
setsFromPlayerSides(...)
```

---

## 6. Validaciones

| Regla | Paso / contexto |
|-------|-----------------|
| ≥2 convocados | Avanzar paso 1 (crear) |
| ≥1 por lado A y B | Crear / guardar editar |
| Capitán por lado | Crear / guardar editar |
| DT por lado | Crear / guardar editar |
| Jugador solo en un lado | Siempre |
| Convocado ∈ categoría del partido | API (sin cambio) |

---

## 7. Edge cases

- Volver de paso 2 a 1: conservar `convokedIds` y asignaciones.
- Desconvocar en paso 1: al volver a paso 2, jugador eliminado no aparece; capitán/DT reset si correspondía.
- Cambiar lado en paso 2: si era capitán/DT del lado anterior, limpiar ese rol.
- Edición: jugadores nuevos convocados entran con reparto `initialSideSplit` solo para los nuevos (sin mover los ya asignados).

---

## 8. Tests

- Unit (`friendly-match-roster-ui.test.ts`): `initialSideSplit`, `setPlayerSide`, `rosterEntriesFromSets`, limpieza capitán/DT.
- Opcional componente Vitest + RTL: paso 1 bloquea avance con &lt;2 jugadores.

---

## 9. Fuera de alcance

- Schema (`FriendlySide` sigue A|B obligatorio).
- Drag-and-drop entre columnas.
- Relajar capitán/DT post-creación.
- Cambios en panel árbitro, live o formaciones.

---

## 10. Referencias

- Código actual: `FriendlyMatchForm.tsx`, `FriendlyMatchRosterEditor.tsx`, `MatchActions.tsx`, `friendly-match-roster.ts`
- Spec original amistosos: `docs/superpowers/specs/2026-07-20-partido-amistoso-design.md`
