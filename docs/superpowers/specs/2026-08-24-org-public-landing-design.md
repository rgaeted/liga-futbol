# Landing pública por empresa — Design Spec

> Fecha: 2026-08-24  
> Producto: **LigaLab**  
> Depende de: tenant layout (`--org-primary`), live público, `Match` / `MatchEvent`, `MarketingShell`  
> Caso de referencia: **Partidos Los Lunes** (`loslunes`)  
> Estado: **Diseño aprobado** (público A; vitrina partido A; CTAs A+B+C; SSR en `/{slug}`)

---

## 1. Objetivo

Cada empresa necesita una **vitrina pública** en `/{slug}` (ej. `/loslunes`) donde cualquiera, sin login, vea lo interesante del partido: live, próximo, últimos resultados y goleadores recientes, con CTAs para ingresar, registrarse y compartir.

Hoy solo existe la landing de producto LigaLab (`/`) y el live por partido. No hay home de marca/liga por org.

---

## 2. Decisiones

| Tema | Elección | Por qué |
|------|----------|---------|
| Audiencia | Público, sin login | Compartible por WhatsApp / link |
| Tono | Vitrina del partido (no “quiénes somos”) | Los Lunes y ligas viven del fixture |
| CTAs | Live (si hay) + Ingresar + Registrarse + Compartir | Cobertura A+B+C |
| Arquitectura | SSR en `/{slug}` + loader server | SEO, un render, patrón `/ayuda` |
| Datos | Solo partido (nombres, marcadores, live) | Nada de cobros, emails, admin |
| Shell | `MarketingShell` / variante con nombre de la org | Cancha de noche + acento tenant |
| Org pausada | Mensaje de pausa del layout tenant | Ya existe; no inventar 404 distinto |

### Alternativas descartadas

1. **Solo usuarios logueados.** El usuario eligió público.
2. **Reusar `/admin/estadisticas`.** Huele a panel; filtra mal (impagos).
3. **API + client fetch.** Peor SEO y más código para v1.
4. **Landing tipo brochure / CMS.** Fuera de alcance v1.
5. **Tabla de posiciones completa + galería.** Scope creep; live y resultados bastan.

---

## 3. Alcance

### Incluido

- Página `src/app/(tenant)/[organizationSlug]/page.tsx` (SSR).
- Loader `getOrgPublicLanding(slug)` en `src/lib/org-public-landing.ts`.
- Proxy: GET/HEAD de `/{slug}` exacto como público.
- UI: hero, live/próximo, últimos resultados, goleadores, pie; CTAs login/register/share/live.
- Tests: slug público vs reservado; shape del payload sin campos sensibles; política de proxy.
- Link opcional desde plataforma (“Ver landing”) — nice-to-have si es 1 línea; no bloquea.

### Excluido

- Editar textos/hero desde admin.
- Open Graph / imágenes sociales custom (metadata básica del layout basta).
- Galerías, artículos, sponsors en la landing.
- Analítica pública (dashboard admin).
- Cobros, cupos, DT, impagos, emails.
- Subdominios por liga.
- App Expo.

---

## 4. Rutas y acceso

| Path | Auth | Notas |
|------|------|--------|
| `/{slug}` | Público | Landing |
| `/{slug}/live/{id}` | Público | Ya existe |
| `/{slug}/ayuda` | Público | Ya existe |
| `/{slug}/admin…` | Login + ORG_ADMIN | Sin cambio |

**Proxy** (`isPublicRequest`): además de live/ayuda, aceptar:

```
(method === 'GET' || method === 'HEAD') &&
  /^\/[^/]+$/.test(pathname) &&
  !RESERVED_ORGANIZATION_SLUGS.has(segment)
```

El segmento debe parsear con `parseOrganizationSlug` (o equivalente): inválido/reservado no se trata como landing pública.

**404:** org inexistente → `notFound()` (layout tenant).  
**PAUSED:** layout actual muestra mensaje de pausa (no redirigir a login).

---

## 5. Loader y payload

```ts
type OrgPublicLanding = {
  organization: {
    name: string
    slug: string
    primaryColor: string
    // logo URL pública si existe helper ya usado; si no, monograma con iniciales
  }
  live: Array<{
    id: string
    label: string
    score: string          // "2 – 1" o "VS" si aún 0-0 live
    status: 'LIVE' | 'HALFTIME'
  }>
  nextMatch: {
    id: string
    label: string
    when: string
    venue: string
  } | null
  results: Array<{
    id: string
    label: string
    score: string
    when: string
  }>                     // max 5 FINISHED
  scorers: Array<{
    name: string
    goals: number
  }>                     // top 5; eventos GOAL en ventana reciente
}
```

**Ventana goleadores:** partidos `FINISHED` de la org con `scheduledAt` en últimos **30 días**, cap **40** partidos más recientes; contar `MatchEvent` tipo `GOAL` (no `OWN_GOAL`, no `Player.goals`).

**Live:** todos los `LIVE`/`HALFTIME` de la org (suele ser 0–1).

**Próximo:** `SCHEDULED` con `scheduledAt >= now`, orden asc, primero. Si también está en `live`, no duplicar énfasis: el bloque “Ahora” prioriza live.

**Resultados:** últimos 5 `FINISHED` por `scheduledAt` desc.

**Prohibido en el payload:** `paid`, emails, `userId`, roles, `organizationMembership`, clima técnico (opcional omitir en v1), formaciones.

Nombres: `matchDisplayName`, `playerDisplayName`, fechas con `APP_LOCALE` / `APP_TIMEZONE`.

---

## 6. UI

Identidad **Cancha de noche**. Brand de la **liga** (nombre) es hero-level; LigaLab solo en el pie.

### Orden

1. **Hero** — logo/monograma + nombre org + una frase (“Partidos, marcador y goleadores”). CTAs: si `live.length > 0` → botón primario “Ver en vivo” al primer live; “Ingresar” (`/login?callbackUrl=/{slug}`), “Registrarse” (`/register`), “Compartir”.
2. **Ahora / Próximo** — live con marcador + link; si no hay live, card del próximo (fecha, sede, vs) con link a live del partido cuando exista o solo texto si aún no.
3. **Últimos resultados** — lista; cada fila link a `/{slug}/live/{id}`.
4. **Goleadores recientes** — top 5; sin link a ficha admin.
5. **Pie** — “Powered by LigaLab” → `/`; “Ayuda” → `/{slug}/ayuda`.

### Compartir (cliente)

- WhatsApp: `https://wa.me/?text=${encodeURIComponent(org.name + ' — ' + absoluteUrl)}`
- Copiar: `navigator.clipboard.writeText(absoluteUrl)` + feedback breve “Link copiado”
- URL absoluta: `origin + '/' + slug` (usar `window.location.origin` en cliente)

### Vacío

Sin partidos: hero + CTAs + mensaje “Aún no hay partidos publicados”.

### Accesibilidad / móvil

Una columna en mobile; CTAs wrap; sin overlay de badges sobre el hero.

---

## 7. Archivos previstos

| Archivo | Rol |
|---------|-----|
| `src/app/(tenant)/[organizationSlug]/page.tsx` | Landing SSR |
| `src/lib/org-public-landing.ts` | Loader + tipos |
| `src/components/marketing/OrgPublicLanding.tsx` | UI (server o client split para share) |
| `src/components/marketing/ShareOrgLink.tsx` | Cliente: WhatsApp + copiar |
| `src/lib/proxy-policy.ts` | `/{slug}` público |
| `tests/lib/org-public-landing.test.ts` | Helpers / shape |
| `tests/lib/proxy-policy.test.ts` | Extender casos públicos |

Reutilizar `MarketingShell` (pasar `productName={org.name}` o adaptar eyebrow). No tocar dashboards admin.

---

## 8. Tests

1. Path `/loslunes` → público; `/loslunes/admin` → no público; `/login` → ya público por otra regla.
2. Segmento reservado no se considera landing org.
3. Helper de scorers: cuenta `GOAL`, ignora `OWN_GOAL`.
4. Payload type / mapper no expone claves `paid` / `email`.

Sin E2E en v1.

---

## 9. Fuera de esta spec

- Landing editable por admin.
- Comparar ligas en una sola página.
- SEO avanzado (JSON-LD, OG image dinámica).
