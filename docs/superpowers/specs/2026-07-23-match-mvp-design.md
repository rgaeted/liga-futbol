# MVP del partido — Design Spec

> Estado: **Aprobado**  
> Fecha: 2026-07-23

---

## Objetivo

Permitir asignar **un MVP por partido** (liga o amistoso), editable por **admin** y **árbitro**, visible en **live**, **admin** y **perfil/stats del jugador**.

## Decisiones

| Tema | Decisión |
|------|----------|
| Cantidad | Un solo MVP por partido (todos los jugadores) |
| Quién edita | Admin + árbitro asignado al partido |
| Cuándo | Solo partidos `FINISHED` |
| Persistencia | `Match.mvpPlayerId` (liga) / `Match.mvpFriendlyPlayerId` (amistoso) |
| Validación | MVP debe estar en plantel del partido (citación o `FriendlyMatchPlayer`) |
| Live | Badge bajo marcador cuando hay MVP y partido finalizado |
| Stats liga | Conteo en `/player` y badge en historial de partidos |
| Stats amistoso | Conteo en `GET /api/friendly-players/[id]/stats` |
| Fuera de alcance v1 | Votación, MVP por equipo, socket en tiempo real para MVP |

## API

`PUT /api/matches/[id]/mvp` — body `{ playerId?: string \| null }` o `{ friendlyPlayerId?: string \| null }`

## UI

- Admin: sección en `/admin/matches/[id]/timeline`
- Árbitro: selector en `/referee/match/[id]` cuando el partido está finalizado
- Live: `⭐ MVP: [nombre]` bajo el marcador
