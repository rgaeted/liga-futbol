# Amistosos / desafíos entre organizaciones — Design Spec

> Estado: **Diseño aprobado**
> Plan: [`docs/superpowers/plans/2026-08-14-amistosos-entre-orgs.md`](../plans/2026-08-14-amistosos-entre-orgs.md)
> Fecha: 2026-08-14
> Producto: **AdminTorneo**
> Depende de: organizaciones. **Recomendado después de jugador único** (`Person`) para no duplicar fichas del visitante.
> Independiente de: pool de árbitros (el árbitro sigue siendo de la org anfitriona).

---

## 1. Objetivo

Una empresa puede **desafiar a otra** a un amistoso: el partido vive en la org anfitriona, el visitante acepta y arma su lado con **su** pool (o un equipo de liga), y el live muestra ambos nombres/logos.

Hoy `Match.organizationId` es único y obligatorio. Los `FriendlyPlayer` del plantel se asumen de esa org. No hay forma de que Kelme juegue contra otra empresa sin copiar jugadores a mano.

El motor de reloj, cronología, formaciones y MVP **se reutiliza**. El amistoso intra-org actual no se rompe: `guestOrganizationId` null.

## 2. Decisiones recomendadas

| Tema | Elección | Por qué |
|------|----------|---------|
| Dueño del partido | Org **anfitriona** (`Match.organizationId`) | Una sola fila Match; live, realtime y APIs públicas siguen por `matchId` |
| Visitante | `guestOrganizationId` opcional | Null = amistoso clásico (lados libres A/B de la misma org) |
| Flujo | Invitación: PENDING → ACCEPTED / DECLINED / CANCELLED | El visitante no aparece en un partido que no aceptó |
| Plantel visitante | `FriendlyMatchPlayer` del lado B con `FriendlyPlayer` de la **org visitante** | Reutiliza pago, galleta, capitán, DT, formaciones |
| Alternativa de plantel | Tras aceptar, el visitante puede **volcar un Team de liga** a lado B (copia de nombres al pool si hace falta) | Útil si la otra liga no usa amistosos; v1: solo pool amistoso del visitante. Volcar equipo de liga **queda fuera de v1** para no mezclar CallUp y FriendlyMatchPlayer |
| Marca en live | Tokens de la org anfitriona; logo de cada org en su lado | El scoreboard ya tiene `organization` + crest de lado |
| Stats | Eventos en `friendlyPlayerId` del visitante; carrera `Person` si ya existe | Sin `Person`, igual funciona a nivel ficha; la carrera cross-org es el valor de hacer esta spec **después** de jugador único |
| Árbitro | User con membership REFEREE en la org **anfitriona** | El panel `/referee` es tenant del anfitrión; el visitante no arbitra salvo share previo |
| Tabla / temporada | Sigue sin temporada (`seasonId` null) | No entra a standings ni a la app móvil de una edición |

### Alternativas descartadas

1. **Match con dos `organizationId` simétricos.** Rompe scoping de APIs (`activeOrganizationId`) y el live tenant `/{slug}/live`.
2. **Permitir `awayTeamId` de otra org en un LEAGUE.** Mezcla tablas de posiciones. Esta spec es solo `FRIENDLY`.

## 3. Alcance

### Incluido

- Campo `guestOrganizationId` + `challengeStatus` en `Match` tipo FRIENDLY.
- Wizard anfitrión: elegir org visitante (directorio de orgs ACTIVE), lado A (su pool), árbitro propio, fecha/cancha; lado B queda bloqueado hasta ACCEPTED.
- Destino: bandeja “Desafíos” para aceptar/rechazar.
- Tras ACCEPTED: admin visitante arma lado B con **su** `FriendlyPlayer` (mismos invariantes: capitán y DT por lado).
- Anfitrión sigue editando lado A, pago de su lado, y el partido (fecha, cancha, árbitro, eventos admin). No edita el plantel B.
- Visitante no cambia fecha/cancha/árbitro.
- Live `/{hostSlug}/live/[matchId]`: nombres de lados; crest de lado o logo de org si no hay crest; footer/branding del anfitrión.
- Redirect legacy innecesario (el id es global).
- Tests de permisos, estados y live 404 si se pide con slug del visitante.

### Excluido

- Liga o tabla entre empresas.
- Volcar `Team` de liga al lado B (v1 solo pool amistoso).
- Desafío público / mural de “busco rival”.
- Cobros entre empresas.
- Árbitro de la org visitante sin membership en la anfitriona.
- App móvil de edición: estos partidos **no** aparecen en `/api/mobile/v1/leagues/[slug]` (filtro actual `matchType=LEAGUE` se mantiene).

## 4. Arquitectura

```text
ORG_ADMIN anfitrión
  crea Match FRIENDLY
    organizationId = host
    guestOrganizationId = guest
    challengeStatus = PENDING
    side A = pool host
    side B = vacío

ORG_ADMIN visitante
  acepta → ACCEPTED
  llena FriendlyMatchPlayer side B (sus FriendlyPlayer)

Live / Referee / Clock
  igual que amistoso intra-org; tenant URL = slug anfitrión
```

| Unidad | Qué hace | Cómo se usa | Depende de |
|--------|----------|-------------|------------|
| Challenge fields en Match | Estado y org visitante | Crear/aceptar | Organization |
| `src/lib/match-challenge.ts` | Transiciones y guards de roster | APIs | org-scope |
| Bandeja desafíos | UI destino | `/{slug}/admin/challenges` | Match |

## 5. Modelo de datos

```prisma
enum ChallengeStatus {
  NONE
  PENDING
  ACCEPTED
  DECLINED
  CANCELLED
}
```

En `Match`:

- `guestOrganizationId String?` FK a `Organization`, `onDelete: Restrict` (no borrar org con desafíos).
- `challengeStatus ChallengeStatus @default(NONE)`.

Invariantes (Zod + servidor, no solo DB):

| matchType | guestOrganizationId | challengeStatus |
|-----------|---------------------|-----------------|
| LEAGUE | null | NONE |
| FRIENDLY intra-org | null | NONE |
| FRIENDLY desafío | required ≠ organizationId | PENDING \| ACCEPTED \| DECLINED \| CANCELLED |

- PENDING/DECLINED/CANCELLED: cero `FriendlyMatchPlayer` en lado B.
- ACCEPTED: mismas reglas de roster amistoso (1+ por lado, capitán y DT por lado) **antes de pasar a LIVE**.
- `FriendlyPlayer` de lado A: `organizationId === match.organizationId`.
- `FriendlyPlayer` de lado B en desafío: `organizationId === match.guestOrganizationId`.

Índice: `@@index([guestOrganizationId, challengeStatus])`.

## 6. Permisos

### Anfitrión (ORG_ADMIN, `activeOrganizationId === match.organizationId`)

- Crear desafío, cancelar si PENDING.
- Editar lado A, fecha, cancha, árbitro, eventos admin, paid/galleta de lado A.
- No editar lado B.
- Ver nombres del plantel B después de ACCEPTED (necesario para live/admin timeline).

### Visitante (ORG_ADMIN, `activeOrganizationId === guestOrganizationId`)

- Listar desafíos hacia su org.
- Aceptar / rechazar PENDING.
- Editar solo lado B (roster, capitán, DT, paid/galleta B, formación B).
- No mutar reloj ni eventos (el árbitro es del anfitrión).
- Ver el live público (GET) como cualquiera; no entra a `/{host}/admin` sin membership.

### Árbitro anfitrión

- Panel actual sobre el plantel combinado (eventos con `friendlyPlayerId` de ambas orgs). Sin cambio de UI más que nombres.

### Platform

- No media el desafío en v1.

## 7. Rutas

| Ruta | Uso |
|------|-----|
| `/{slug}/admin/matches/new/friendly` | Checkbox/paso “Desafiar a otra organización” |
| `/{slug}/admin/challenges` | Recibidos y enviados |
| `POST /api/matches` | Body extra `guestOrganizationSlug?` → PENDING |
| `POST /api/matches/[id]/challenge/accept` | Visitante |
| `POST /api/matches/[id]/challenge/decline` | Visitante |
| `POST /api/matches/[id]/challenge/cancel` | Anfitrión, solo PENDING |
| `GET /{hostSlug}/live/[matchId]` | Público; **404 si el slug no es el anfitrión** (ya validado en hardening) |

`GET /api/admin/organizations-directory` (mismo que pool de árbitros si ya existe): lista orgs ACTIVE `id, slug, name, logoUrl`.

## 8. UX

- Al crear amistoso: “Solo mi organización” (default) vs “Desafiar a otra liga”.
- PENDING: tarjeta en ambos calendarios “Esperando a {org}”. El visitante no ve el live como partido suyo en admin; sí puede abrir el link público del anfitrión.
- ACCEPTED: el wizard de lado B para el visitante reutiliza `FriendlyMatchTeamAssigner` filtrado a su pool.
- Live: encabezado con logo anfitrión; cada lado puede mostrar logo de org si no hay crest de lado.

Copy: “Desafiar a otra liga”, “Esperando respuesta”, “Armar tu lado”, “Kelme canceló el desafío”.

## 9. Errores

- Guest slug inexistente, pausada o igual al host → 400.
- Aceptar sin ser la org visitante → 403.
- Aceptar no-PENDING → 409.
- Poner FriendlyPlayer de org incorrecta en un lado → 400.
- Pasar a LIVE con desafío no ACCEPTED o sin DT/capitán B → 400 (misma guardia que amistoso actual).
- Org visitante pausada: no se puede aceptar; PENDING se puede cancelar.

## 10. Pruebas

- Intra-org friendly sin guest sigue NONE y el wizard actual.
- Crear desafío deja lado B vacío y status PENDING.
- Visitante acepta y carga su pool; anfitrión no puede POST de jugadores B.
- Live con slug visitante → 404; con slug anfitrión → 200.
- Gol de un FriendlyPlayer visitante no altera `Player.goals` de liga.
- API móvil de una temporada no lista el desafío.
- Rechazar deja DECLINED y no aparece en calendario activo (filtro: no mostrar DECLINED/CANCELLED en “próximos”).

## 11. Orden de implementación

Si jugador único **aún no** está en prod: se puede implementar igual (las fichas visitante son `FriendlyPlayer` de su org). Si `Person` ya existe, el perfil de carrera del visitante suma estos amistosos automáticamente.

## 12. Fuera de discusión en implementación

No se cambia reloj, formaciones, MVP ni realtime. No se abre `MatchType.LEAGUE` entre orgs.
