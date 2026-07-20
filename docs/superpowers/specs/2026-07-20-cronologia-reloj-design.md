# Cronología editable y reloj automático — Design Spec

> Estado: **Aprobado**  
> Fecha: 2026-07-20  
> Decisiones: entretiempo con pausa (A), edición admin completa (A), reloj visible en live (A).

---

## 1. Objetivo

Permitir que el **árbitro** registre eventos sin escribir el minuto manualmente — el reloj corre solo desde el inicio del partido, se pausa en el entretiempo y reanuda en el 2.º tiempo. El **admin** puede ver y editar la cronología completa (corregir, eliminar, agregar eventos). Los **espectadores** ven el reloj en vivo en `/live/[matchId]`.

---

## 2. Alcance

### Incluye

- Campos de reloj en `Match` (`clockStartedAt`, `secondHalfStartedAt`, `halftimeAt`)
- Cálculo server-side del minuto al registrar eventos (árbitro)
- Reloj automático en panel del árbitro (sin input manual)
- Reloj visible en live scoreboard cuando `LIVE` o `HALFTIME`
- Admin: página `/admin/matches/[id]/timeline` con CRUD de eventos
- Recálculo de marcador y stats de liga tras ediciones admin
- Socket incluye timestamps de reloj para sync en clientes

### Fuera de alcance

- Tiempo añadido / stoppage time configurable
- Edición del reloj en sí (solo se corrigen minutos de eventos ya registrados)
- Notificaciones push
- Historial de auditoría de cambios admin

---

## 3. Arquitectura

Reloj **autoritativo en servidor**: timestamps en `Match` definen el minuto actual. Clientes (árbitro, live) calculan display con `setInterval` + sync vía SSR/socket.

```
Árbitro → POST evento (sin minute) → registerMatchEvent
  → getMatchMinute(match, now) → guarda evento.minute
  → actualiza clock fields en KICKOFF/HALFTIME/FULLTIME
  → emitMatchUpdate (+ clock fields)

Admin → PATCH/DELETE/POST (con minute opcional) → reconcileMatchState
  → recalcula homeScore/awayScore desde eventos
  → syncLeaguePlayerStats para jugadores afectados
  → emitMatchUpdate

Live / Árbitro → getMatchMinute desde clock fields + status
```

---

## 4. Modelo de datos

### 4.1 Campos nuevos en `Match`

```prisma
clockStartedAt       DateTime?  // 1.er tiempo (primer KICKOFF)
secondHalfStartedAt  DateTime?  // 2.º tiempo (KICKOFF tras HALFTIME)
halftimeAt           DateTime?  // pausa del reloj
```

### 4.2 Lógica de reloj

| Status     | Minuto mostrado |
|------------|-----------------|
| SCHEDULED  | 0 |
| LIVE (1T)  | `floor((now - clockStartedAt) / 60s)` |
| HALFTIME   | Minuto congelado al marcar entretiempo |
| LIVE (2T)  | `45 + floor((now - secondHalfStartedAt) / 60s)` |
| FINISHED   | Minuto del evento FULLTIME (o último calculado) |

### 4.3 Eventos de control

| Evento    | Efecto en reloj / status |
|-----------|--------------------------|
| KICKOFF (desde SCHEDULED) | `clockStartedAt = now`, status → LIVE |
| HALFTIME  | `halftimeAt = now`, status → HALFTIME |
| KICKOFF (desde HALFTIME)  | `secondHalfStartedAt = now`, status → LIVE |
| FULLTIME  | status → FINISHED (reloj detenido) |

Segundo KICKOFF se distingue por `match.status === HALFTIME` (no se agrega enum nuevo).

---

## 5. API

### 5.1 POST `/api/matches/[id]/events` (modificar)

- **Árbitro:** `minute` omitido → servidor calcula con `getMatchMinute`
- **Admin:** `minute` opcional; si se omite, también se calcula (útil solo si partido en vivo)
- Rechazar eventos de juego si status no es `LIVE` (excepto ADMIN agregando retroactivamente)

### 5.2 PATCH `/api/matches/[id]/events/[eventId]` (nuevo, ADMIN)

Body parcial: `type`, `minute`, `playerId`, `teamId`, `friendlyPlayerId`, `side`, `description`

→ actualiza evento → `reconcileMatchState(matchId)`

### 5.3 DELETE `/api/matches/[id]/events/[eventId]` (nuevo, ADMIN)

→ elimina evento → `reconcileMatchState(matchId)`

### 5.4 GET `/api/matches/[id]/clock` (nuevo, público)

Retorna `{ minute, status, clockStartedAt, secondHalfStartedAt, halftimeAt }` para polling/sync.

---

## 6. UI

### 6.1 Árbitro (`MatchControlPanel`)

- Eliminar input numérico de minuto
- Mostrar reloj grande (`MM'` o `45+MM'` en 2T)
- Botón **▶ Inicio** (1.er tiempo) / **▶ 2.º tiempo** (mismo `KICKOFF`, label según status)
- Resto de botones sin cambio

### 6.2 Live (`LiveScoreboard`)

- Reloj prominente bajo marcador cuando `LIVE` o `HALFTIME`
- `useMatchClock` hook compartido con árbitro

### 6.3 Admin

- Link **Cronología** en cada partido en `/admin/matches`
- Página `/admin/matches/[id]/timeline`:
  - Tabla eventos ordenados por minuto
  - Editar inline o modal
  - Eliminar con confirmación
  - Formulario agregar evento (minuto manual)

---

## 7. Recálculo de estado (`reconcileMatchState`)

1. **Marcador:** sumar `GOAL` / `OWN_GOAL` de todos los eventos (liga por `teamId`, amistoso por `side`)
2. **Status:** no se recalcula desde eventos (lo controla árbitro/admin vía eventos de control o `MatchActions`)
3. **Stats liga:** para cada `playerId` afectado (actual + anterior en PATCH), ejecutar `syncLeaguePlayerStats(playerId)` — cuenta global desde todos los `MatchEvent` de partidos `LEAGUE`
4. **Amistosos:** stats no tocan `Player.goals` (sin cambio)
5. Emitir socket con match + último evento si aplica

---

## 8. Errores y permisos

| Caso | Respuesta |
|------|-----------|
| Árbitro no asignado | 403 |
| PATCH/DELETE sin rol ADMIN | 401/403 |
| Evento de juego con partido SCHEDULED (árbitro) | 400 «El partido no está en juego» |
| Minuto fuera de rango (admin) | 400 |
| Jugador/equipo requerido faltante | 400 (mensajes en es-CL) |

---

## 9. Tests (Vitest)

- `getMatchMinute` — 1T, HALFTIME congelado, 2T, FINISHED
- `reconcileMatchState` — marcador tras editar/eliminar goles
- `createMatchEventSchema` — minute opcional
- `syncLeaguePlayerStats` — conteo correcto tras delete de gol

---

## 10. Migración

```sql
ALTER TABLE "Match" ADD COLUMN "clockStartedAt" TIMESTAMP(3),
ADD COLUMN "secondHalfStartedAt" TIMESTAMP(3),
ADD COLUMN "halftimeAt" TIMESTAMP(3);
```
