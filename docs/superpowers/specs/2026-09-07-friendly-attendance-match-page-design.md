# Asistencia por página de amistoso — Design Spec

> Fecha: 2026-09-07  
> Producto: **LigaLab**  
> Depende de: `MatchAttendance` (2026-09-07), wizard amistoso, roster `FriendlyMatchPlayer`, landing `/{slug}`, live `/{slug}/live/[id]`  
> Caso de referencia: **Partidos Los Lunes** (`loslunes`)  
> Estado: **Diseño aprobado** (página pública A; landing con tarjetas A; roster desde anotados + extras B; ruta `/{slug}/partidos/[id]` A; dos fases)

---

## 1. Objetivo

El ritual del grupo (anotar el nombre para el lunes) vive en **una página pública por partido**, no en un bloque suelto de la landing. El admin **crea el amistoso vacío**, comparte el link, y **después** arma los equipos con los que tocaron Voy (puede sumar a alguien que no anotó).

Hoy el wizard exige convocar y asignar lados al crear, y la asistencia se lista completa en la landing / panel. Eso se invierte.

---

## 2. Decisiones

| Tema | Elección | Por qué |
|------|----------|---------|
| Quién ve la página del partido | Público: lista visible; Voy pide login | Reemplazo del hilo de WhatsApp |
| Landing | Tarjeta/link por amistoso programado; sin lista completa | La lista es del partido, no de la home |
| Roster | Primero anotados; admin puede agregar extras | La lista guía, no es un candado |
| Ruta | `/{slug}/partidos/[id]` nueva | Encabezado + asistencia; live no se mezcla |
| Modelo | Dos fases: `MatchAttendance` ≠ `FriendlyMatchPlayer` | No romper formación, pagos, live |
| Crear | Sin jugadores, sin capitán, sin DT | El partido existe para anotar nombres |
| Armar equipos | Al editar; ahí sí capitán y DT por lado | Las reglas actuales de roster siguen valiendo **cuando hay roster** |

### Alternativas descartadas

1. **Página solo con sesión.** El usuario eligió pública (A).
2. **Listas completas en landing + página aparte.** Duplica el ritual.
3. **Reusar `/live/[id]`.** El live es marcador; el partido programado es otra pantalla.
4. **Una sola tabla con `side` opcional.** Choca con formación, pagos, unique y validaciones.
5. **Voy crea `FriendlyMatchPlayer` solo.** Mezcla RSVP con convocatoria.

---

## 3. Alcance

### Incluido

- Crear amistoso **intra-org** sin `players` (wizard sin pasos convocatoria/equipos).
- Página pública `/{slug}/partidos/[id]`: encabezado del partido + `MatchAttendanceBoard`.
- Proxy: GET/HEAD de `/{slug}/partidos/:id` público.
- Landing: `attendances[]` se muestra como **tarjetas** (fecha, lados, conteo, CTA) → `/{slug}/partidos/[id]`.
- Panel jugador: mismos links (no el board completo).
- Nav **¿Quién va?** → `/{slug}#asistencia` (sección de tarjetas).
- Admin: link “Ver lista” en la tarjeta; al **editar** el asignador prioriza anotados y permite extras.
- Validación: `createFriendlyMatchSchema.players` opcional / vacío; `updateMatchSchema.players` si viene, exige roster válido (2+ lados, capitán y DT por lado).
- Tests: proxy público, create sin players, update con extras no anotados, shape de tarjeta de landing.

### Excluido

- Desafíos entre orgs (`createFriendlyChallenge`): siguen pidiendo roster del lado local. Sin cambio en v1.
- Enviar WhatsApp / notificaciones / Realtime.
- App Expo.
- “Tal vez”.
- Auto-asignar lado al tocar Voy.
- Cambiar reglas de live, pagos, galleta, formación.
- Página `/{slug}/partidos/[id]` para partidos de **liga** (404). El live de liga no cambia.

---

## 4. Flujo

```
Admin crea amistoso (fecha, cancha, nombres/colores, categoría)
        ↓
Partido SCHEDULED, attendances = []
        ↓
Landing / WhatsApp → /{slug}/partidos/{id}
        ↓
Jugador ingresa y toca Voy (MatchAttendance)
        ↓
Admin edita partido → elige anotados (+ extras) y lado A/B
        ↓
FriendlyMatchPlayer existe → formación / pagos / live como hoy
        ↓
status LIVE → Voy se cierra
```

---

## 5. Rutas y acceso

| Path | Auth | Notas |
|------|------|--------|
| `/{slug}/partidos/[id]` | Público GET | Solo `FRIENDLY`. Encabezado + lista |
| `GET /api/matches/:id/attendance` | Público | Sin cambio |
| `POST/DELETE /api/matches/:id/attendance` | Sesión + ficha en `match.organizationId` | Sin cookie de org |
| `/{slug}` | Público | Tarjetas, no boards |
| `/{slug}/live/[id]` | Público | Sin cambio |
| `/{slug}/admin/matches` | ORG_ADMIN | Crear vacío; editar roster |

**Proxy** — agregar junto a live/ayuda:

```
(method === 'GET' || method === 'HEAD') &&
  /^\/[^/]+\/partidos\/[^/]+$/.test(pathname) &&
  parseOrganizationSlug(slug).ok
```

Si el `id` no existe, no es FRIENDLY, o no pertenece a esa org → 404.

---

## 6. UI

### Página `/{slug}/partidos/[id]`

- Encabezado: fecha/hora (`es-CL`), lados (o “en preparación” si son placeholders), cancha, estado Programado.
- CTA “Ver en vivo” solo si `LIVE` / `HALFTIME` / `FINISHED` (link a `/{slug}/live/[id]`).
- Sección **¿Quién va?** con el board actual (Voy / Ya no voy / login).
- Copy sin cambio: "¿Quién va?", "Voy", "Ya no voy", "Ingresa para anotar tu nombre", "El listado se cierra cuando empieza el partido."
- Login: `callbackUrl=/{slug}/partidos/{id}`.

### Landing

- Sección `#asistencia`: una tarjeta por amistoso `SCHEDULED` futuro.
- Cada tarjeta: `dateLine`, `matchLabel`, `N anotados`, link “Anotar nombre” / “Ver quién va”.
- Sin `<MatchAttendanceBoard>` en la landing.

### Admin editar roster

- Lista de candidatos: **anotados primero** (orden `createdAt ASC`), después el resto del roster de la categoría, no duplicados.
- Badge “Va” en anotados.
- Asignar lado A/B, capitán, DT como hoy.
- Guardar `players` vacío **no** está permitido en el update (si envía `players`, min 2 + reglas). Para dejar el partido sin equipos, el admin no envía `players` (solo metadata).
- Quitar a alguien del roster no borra su `MatchAttendance`.

---

## 7. Datos y validación

- **Crear intra:** `players` omitido o `[]`. No llama `syncFriendlyMatchRoster`.
- **Update:** si `players` está presente, `refineFriendlyPlayers` (lados A y B, un capitán y un DT por lado). Un extra no anotado es válido.
- **Attendance:** un registro por `(matchId, playerId)`; POST/DELETE idempotentes. No escribe `FriendlyMatchPlayer`.
- **Cierre:** `canOpenMatchAttendance` sigue siendo FRIENDLY + SCHEDULED.

---

## 8. Arquitectura

Unidades:

| Unidad | Hace | Depende de |
|--------|------|------------|
| `createFriendlyMatchSchema` | Permite crear sin roster | Zod actual |
| Página `partidos/[id]` | SSR encabezado + board | loader partido + attendance + viewer |
| `isPublicRequest` | GET/HEAD `/partidos/:id` | `parseOrganizationSlug` |
| Tarjetas landing | Links + conteo | `toMatchAttendanceBoard`; la tarjeta muestra `dateLine`, `matchLabel` y `N anotados`, no la lista de nombres |
| Asignador admin | Ordena anotados primero | `MatchAttendance` + roster categoría |

No importar Prisma en componentes `'use client'`. El board sigue recibiendo props serializadas.

---

## 9. Tests

- Proxy: GET `/loslunes/partidos/m1` público; POST no.
- Create friendly sin `players` → success; con 1 jugador inválido sigue fallando.
- Update con un extra no anotado + roster válido → success.
- `canOpenMatchAttendance` / API 409 si no SCHEDULED (ya existe).
- Landing payload: `attendances[]` tiene `matchId`, `dateLine`, `matchLabel`, `count` (o `attendees.length`); la UI de landing no monta el board.

---

## 10. Fuera de v1 (explícito)

WhatsApp automático, desafíos, liga, Expo, Realtime, “tal vez”, auto-lado al Voy.
