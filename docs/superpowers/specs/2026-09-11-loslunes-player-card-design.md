# Carta de jugador Los Lunes — Design Spec

> Estado: **Diseño aprobado en sesión**
> Fecha: 2026-09-11
> Producto: **LigaLab**
> Org: **Partidos Los Lunes** (`slug: loslunes`)
> Maquetas: `docs/superpowers/mocks/2026-09-11-player-card/` (`carta-loslunes.html` es la fuente de verdad visual; `informe-pro.html` y `tokens.css` son referencia, fuera de v1 de producto)
> Plan: se escribe en `docs/superpowers/plans/2026-09-11-loslunes-player-card.md` después de aprobar esta spec

---

## 1. Objetivo

Convertir goles, asistencias y presencias **ya registradas** en una **carta de identidad** por jugador (atributos 0–99 + OVR) que evoluciona con la ventana de 30 días.

Principio: **"Stats reales, cero humo — la carta se gana en la cancha, nunca se compra."** Ninguna acción in-app sube un atributo.

Alcance elegido: **carta v1** (motor + API + página pública + compartir imagen). Sin Informe Pro, sin gráfico de evolución, sin premios automáticos, sin UI de semilla del capitán.

---

## 2. Decisiones

| Tema | Elección |
|------|----------|
| Alcance | Motor puro, GET JSON, página pública, OG/PNG para WhatsApp |
| Org | Solo `loslunes`. Otras orgs → 404 |
| Visibilidad | Pública, sin login |
| Posición ausente | Banda **MED** |
| Cálculo | En vivo al GET (sin tabla snapshot) |
| Semilla REG/RIT/FÍS | `BASE_LIGA = 65` + jitter determinista del `playerId` + bonus de hitos. Sin campo nuevo ni UI de capitán |
| Remates | `pesoConversion = 0` (TIR solo goles/PJ) |
| Informe Pro | Fuera. Maqueta `informe-pro.html` queda como referencia de un producto pago futuro |
| Menores / Kelme Cup | No aplica este sistema |

### Alternativas descartadas

1. **Snapshot al cerrar cada lunes.** Infra de evolución; v1 no la muestra.
2. **Solo imagen OG, sin página.** El link de WhatsApp no abre una carta.
3. **Carta solo en el panel `/player`.** Rompe el loop de compartir.
4. **OVR oculto sin posición.** Demasiadas cartas vacías; MED es el default.

---

## 3. Arquitectura

Sin migración Prisma.

```text
FINISHED friendlies (30d) + eventos + MVP + premio
        │
        ▼
calcularCarta(...)          ← puro, Vitest
        │
        ├── GET /api/players/[id]/card
        ├── GET /loslunes/jugador/[id]
        └── GET /loslunes/jugador/[id]/og
```

| Unidad | Qué hace | Cómo se usa | Depende de |
|--------|----------|-------------|------------|
| `calcularCarta` | Atributos, OVR, estado | Tests + API + página | Crudos + percentiles + semilla |
| Agregador de ventana | Goles, asistencias, PJ, presencias, MVP, tarjetas, rachas | Solo org `loslunes` | `FriendlyMatchPlayer`, `MatchEvent`, `MatchTeamMvp` |
| Proxy | GET/HEAD públicos | `src/lib/proxy-policy.ts` | Igual que `/partidos/[id]` |
| Vista carta | Pinta JSON, no calcula | Ruta tenant | Maqueta HTML |
| OG image | PNG de la misma carta | WhatsApp unfurl + botón compartir | `next/og` o canvas servidor |

El front **no** inventa números.

---

## 4. Modelo de atributos

Seis atributos 0–99.

| Atributo | Nombre | Clase | Fuente v1 |
|----------|--------|-------|-----------|
| TIR | Definición | Derivado | Goles por partido (percentil p10/p90) |
| VIS | Visión | Derivado | Asistencias por partido (percentil) |
| RES | Resistencia | Derivado | % de fechas en cancha (mapeo absoluto 50–99) |
| REG | Regate | Semilla + ajuste | 65 + jitter + bonus |
| RIT | Ritmo | Semilla + ajuste | 65 + jitter + bonus |
| FÍS | Físico | Semilla + ajuste | 65 + jitter + bonus |

**MIN_PJ = 2.** Con menos: estado `en_formacion`; TIR/VIS se muestran “–”; REG/RIT/FÍS sí se muestran; badge “Faltan N partidos para tu primera carta completa”.

---

## 5. Ventana y crudos

- Ventana móvil **30 días**, timezone `APP_TIMEZONE` (`America/Santiago`).
- Partidos: `matchType = FRIENDLY`, `status = FINISHED`, `organizationId` de Los Lunes, `scheduledAt` dentro de la ventana.
- **Presencia:** el jugador está en `FriendlyMatchPlayer` de esa fecha. No basta `MatchAttendance` (eso es “Voy” antes del partido).
- **fechasPosibles:** cantidad de esos partidos de la org en la ventana.
- **Goles:** eventos `GOAL` y `PENALTY_GOAL` del jugador. No `OWN_GOAL`.
- **Asistencias:** `assistPlayerId` en esos goles.
- **MVP:** `MatchTeamMvp` en partidos de la ventana.
- **Amarillas / rojas:** eventos `YELLOW_CARD` / `RED_CARD`.
- **Racha goleadora:** fechas consecutivas más recientes (dentro de la ventana, orden cronológico) con ≥1 gol. Hito si ≥ 3.
- **Racha presencia:** fechas consecutivas más recientes en cancha. Hito si ≥ 5.
- **Equipo en la carta:** último `FriendlySide` → Blancos / Negros (nombres de lado de Los Lunes).
- **Premio:** el `PlayerAward` más reciente de la org, si existe (sigue siendo editorial).
- **Foto:** `GET /api/players/{id}/photo` existente.
- **Escudo:** `/branding/loslunes-logo.png`.

Si `fechasPosibles = 0`: RES = 50, estado `en_formacion`.

---

## 6. Fórmulas

### 6.1 `normalizar`

```
normalizar(valor, p10, p90, piso = 40, techo = 99)
  si p90 <= p10 → round((piso + techo) / 2)
  t = clamp((valor - p10) / (p90 - p10), 0, 1)
  round(piso + t * (techo - piso))
```

p10/p90: entre jugadores de la org con `pj >= MIN_PJ` en la ventana.

### 6.2 TIR / VIS / RES

```
TIR = normalizar(goles / pj, p10_gpp, p90_gpp)     // pesoConversion = 0
VIS = normalizar(asistencias / pj, p10_app, p90_app)
RES = round(50 + (presencias / max(1, fechasPosibles)) * 49)   // 50..99
```

No usar percentil en RES.

### 6.3 Posición → banda OVR

Mapear `primaryPosition` (fallback `position`) con `playerPositionBand` existente:

| Banda | Código carta | Pesos TIR, VIS, RES, REG, RIT, FÍS |
|-------|--------------|--------------------------------------|
| 3 ataque | DEL | 0.34, 0.16, 0.16, 0.14, 0.12, 0.08 |
| 2 medio | MED | 0.18, 0.30, 0.16, 0.16, 0.12, 0.08 |
| 1 defensa | DEF | 0.08, 0.16, 0.22, 0.14, 0.16, 0.24 |
| 0 arquero | POR | 0.04, 0.12, 0.28, 0.10, 0.10, 0.36 |

Sin posición o banda null → **MED**.

`OVR = round(Σ atributo[k] * peso[k])`. Si `pj < MIN_PJ`, `ovr` es `null` y la UI muestra “–” (no se pondera con TIR/VIS inventados).

### 6.4 REG / RIT / FÍS

```
jitter = offset fijo -4..+4 derivado del playerId, distinto por atributo
bonus  = mvps * 2
       + (rachaGoleadora >= 3 ? 3 : 0)
       + (rachaPresencia >= 5 ? 2 : 0)
       - rojas * 3
REG/RIT/FIS = clamp(65 + jitter + bonus, 40, 95)
```

Jitter estable: mismo id → mismos offsets. No aleatorio en runtime.

---

## 7. Contrato JSON

`GET /api/players/[id]/card`

El handler resuelve el jugador, exige `organization.slug === 'loslunes'`, org activa, y responde:

```jsonc
{
  "player": {
    "id": "...",
    "nombre": "Fernando Opitz",
    "nombreCorto": "F. Opitz",  // inicial del primer nombre + apellido
    "posicion": "DEL",
    "equipo": "Blancos",
    "fotoUrl": "/api/players/{id}/photo",
    "escudoUrl": "/branding/loslunes-logo.png",
    "premio": "Patrimonio Histórico"
  },
  "ventana": {
    "dias": 30,
    "desde": "2026-08-12",
    "hasta": "2026-09-11",
    "fechasPosibles": 5,
    "pj": 3,
    "minPj": 2
  },
  "crudos": {
    "goles": 7,
    "asistencias": 5,
    "presencias": 3,
    "mvps": 2,
    "amarillas": 1,
    "rojas": 0,
    "rachaGoleadora": 3,
    "rachaPresencia": 5
  },
  "atributos": { "TIR": 88, "VIS": 82, "RES": 90, "REG": 74, "RIT": 79, "FIS": 71 },
  "ovr": 86,
  "estado": "completa"
}
```

En `en_formacion`: `atributos.TIR` y `VIS` son `null`; `ovr` es `null`.

Copy de fechas en UI: locale `es-CL`. Firma: “Fútbol de los Lunes · LigaLab”.

---

## 8. Rutas y proxy

| Ruta | Uso |
|------|-----|
| `GET /loslunes/jugador/[playerId]` | Página pública de la carta |
| `GET /loslunes/jugador/[playerId]/og` | PNG OG (1200×630 o carta recortada; WhatsApp debe ver imagen) |
| `GET /api/players/[id]/card` | JSON. 404 si el jugador no es de `loslunes` |
| Panel ` /loslunes/player` | Link “Ver mi carta” → la ruta pública |
| Landing `/loslunes` | Nombre en goleadores / asistencias (30d) → `/loslunes/jugador/{id}` |

Proxy (`isPublicRequest`): GET/HEAD de

- `/loslunes/jugador/[id]`
- `/loslunes/jugador/[id]/og`
- `/api/players/[id]/card`

Org pausada → 503 coherente con live/landing.

No hay POST/PUT de carta.

---

## 9. UX visual

Fuente de verdad: `carta-loslunes.html`.

- Piel **solo** en esta ruta. No importar `tokens.css` en `globals.css`.
- Fuentes de la carta: Anton (display) + Barlow Condensed (texto), cargadas en esa ruta (no reemplazan Oswald/Manrope del resto).
- Marco dorado `conic-gradient`, interior verde noche, halo de foto, barras on fire `#3DE68C` / `#1FA968`.
- Atributo ≥ 85 → cifra `.hot` verde.
- Fallback foto: iniciales en círculo, **nunca** silueta gris.
- `en_formacion`: grises parciales + badge de partidos que faltan.
- Botón **Compartir carta**: Web Share si existe; si no, descarga PNG. Copy de apoyo: “Stats reales, cero humo.”
- Sin emojis como iconos. Oro solo en datos ganados (OVR, marco, premio), no en errores.
- `viewport` de la carta puede permitir zoom (página pública para compartir); no heredar `userScalable: false` si impide leer en el celular — si el root layout lo fuerza, esta ruta no tiene que pelearlo en v1.

---

## 10. Errores

| Caso | Respuesta |
|------|-----------|
| Slug ≠ `loslunes` | 404 |
| Jugador inexistente o de otra org | 404 |
| Org pausada | 503 |
| Liga homogénea p90 ≤ p10 | TIR/VIS al medio (69) |
| GET carta de jugador Kelme | 404 (no filtrar “silencioso” a otra org) |

---

## 11. Pruebas

- `normalizar`: homogénea, clamp, percentil.
- `calcularCarta` con crudos tipo Opitz (2,3 gol/PJ top, 1,7 asist/PJ, presencia casi plena) → TIR/VIS/RES en la banda del spec, no valores exactos mágicos si los p10/p90 de test se fijan en el caso.
- `pj < 2` → `en_formacion`, OVR null.
- Sin posición → MED.
- Jitter idéntico en dos llamadas; REG/RIT/FÍS ≤ 95.
- Proxy: las tres rutas GET son públicas; POST `/api/players/x/card` no es público (no existe).
- API: jugador de `kelme` → 404.

No correr la suite móvil completa. Sí los tests tocados + `tests/lib/proxy-policy` si existe.

---

## 12. Fuera de alcance

- Informe Pro PDF / producto pago.
- Snapshot histórico y “tu carta subió +3”.
- Duelo de nóminas (suma de OVR Blancos vs Negros).
- Premios automáticos (Goleador del mes).
- UI para que el capitán fije semilla 50–80.
- Wearables.
- App Expo.
- Cartas en otras orgs (Kelme, Le Park, demo).
- Módulo formativo <15.

---

## 13. Relación con el producto actual

Reutiliza: eventos de gol/asistencia, `FriendlyMatchPlayer`, `MatchTeamMvp`, fotos Person, premios editoriales, rankings 30d de la landing, `playerPositionBand`, `LOSLUNES_SLUG`.

No cambia el ritual “¿Quién va?” ni el live.
