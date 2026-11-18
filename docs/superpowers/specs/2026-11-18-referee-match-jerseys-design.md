# Dorsal por partido asignado por el árbitro (diseño corto)

**Por qué:** el árbitro anda con el celular en la mano y necesita asignar el dorsal de cada jugador antes del pitazo inicial. El dorsal puede ser distinto en cada partido.

## Objetivos
- El árbitro asignado fija el dorsal de cada jugador (liga y amistosos) mientras el partido está `SCHEDULED`.
- Al iniciar el partido el dorsal queda fijo.
- Uso cómodo en móvil (campo numérico grande, guarda al salir del campo).

## No objetivos
- No cambia `Player.jerseyNumber` (permanente, lo sigue editando el admin).
- No se crea ni modifica `CallUp`/`FriendlyMatchPlayer` desde el árbitro.

## Enfoques
1. Campo en `CallUp`/`FriendlyMatchPlayer`: no sirve cuando el equipo no tiene convocatoria; crear `CallUp` cambiaría quién aparece en el panel.
2. **Elegido:** tabla `MatchPlayerJersey` (matchId, playerId, side, number). Funciona igual para liga y amistosos y no toca la convocatoria.

## Diseño
- Prisma: `MatchPlayerJersey` con unique (matchId, playerId) y unique (matchId, side, number).
- `PUT /api/matches/[id]/jerseys`: solo el árbitro del partido, solo `SCHEDULED`; number 0–99 o null (borra); error 409 si el número se repite en el equipo.
- Panel del árbitro: lista por equipo con input numérico; valor inicial = dorsal del partido, o el permanente como sugerencia. Tras iniciar, solo lectura. `#dorsal` junto al nombre en selectores de eventos.
- Timeline y lineup del admin usan el dorsal del partido, con el permanente como respaldo.

## Decisiones del builder
Rango 0–99, textos en es-CL con tuteo.
