# App móvil por temporada como producto — Design Spec

> Estado: **Diseño aprobado**
> Plan: [`docs/superpowers/plans/2026-08-14-app-movil-por-temporada.md`](../plans/2026-08-14-app-movil-por-temporada.md)
> Fecha: 2026-08-14
> Producto: **AdminTorneo**
> Depende de: organizaciones + CMS móvil ya existente (`SeasonMobileConfig`, API `/api/mobile/v1/leagues/[slug]`, piloto Expo Kelme Invierno 2026).
> Independiente de: jugador único, pool de árbitros, desafíos entre orgs.

---

## 1. Objetivo

Cada empresa puede tener **una app pública por temporada** (fixture, tabla, live, noticias), reutilizando la plantilla Expo del piloto Kelme. El panel web es la fuente de verdad; un desarrollador (tú o un agente) **genera la edición y publica en tiendas**. No hay publicación automática ni una sola app multi-liga.

Hoy existe:

- `SeasonMobileConfig` (slug, nombre, colores, logo, `isPublished`).
- API pública versionada por **slug de edición**, no por org.
- App Expo con `editions/<key>/edition.config.ts` y `EDITION=...` al compilar.
- Una sola edición registrada en código: `liga-invierno-kelme-puerto-varas-2026`.

Falta: wizard de producto en el admin de la org, visibilidad en `/plataforma`, y un script que **no olvide** bundle id, scheme y assets al sacar la siguiente app.

## 2. Decisiones recomendadas

| Tema | Elección | Por qué |
|------|----------|---------|
| 1 app = 1 temporada publicada | Se mantiene la spec 2026-08-12 | Archivo histórico por edición; branding y notificaciones aislados |
| Quién publica en tiendas | Humano + script de scaffolding, **no** EAS Submit desde Vercel | Cuentas Apple/Google, review y certificados no caben en el panel |
| Quién configura datos | ORG_ADMIN de la empresa (CMS que ya existe) | La org dueña de la temporada |
| Slug de edición | Unique global, inmutable, distinto del slug de org | El contrato móvil no lleva `/{org}`; Kelme puede tener N temporadas |
| Identidad nativa | `edition.config.ts`: bundle id, package, url scheme, colores, `apiBaseUrl` | Ya es el patrón del piloto |
| `apiBaseUrl` | Siempre el host AdminTorneo de prod (`https://torneos-kelme.vercel.app` hasta dominio propio) | Una API, muchas apps |
| App Store Connect / Play | Fuera del código: checklist en docs | No hay API estable ni secretos de tienda en el repo |
| Login en la app | Sigue **sin cuenta** | Spec 2026-08-12; no se reabre |

### Alternativas descartadas

1. **Una sola app “AdminTorneo” con selector de ligas.** Mezcla clientes, notificaciones y review de tiendas; contradice el piloto aprobado.
2. **Publicar EAS desde el panel.** Secretos de Apple/Google en Vercel y un clic peligroso; no es v1.

## 3. Alcance

### Incluido

- Wizard admin `/{slug}/admin/content/mobile` (o sección en contenido): crear/editar `SeasonMobileConfig` (slug, displayName, shortName, description, colores, logo, publicar/despublicar).
- Validación de slug: minúsculas, números, guiones; **no** puede ser un slug de org reservado; unique global.
- Publicar (`isPublished=true`) exige logo, displayName, slug, y al menos 1 `SeasonTeam`. Despublicar deja de servir la API (404) como hoy.
- Panel `/plataforma/apps`: lista ediciones (org, temporada, slug, published, ¿existe carpeta Expo en el repo? — esto último es documental, no un probe de filesystem en runtime).
- Script `npx tsx scripts/create-mobile-edition.ts --seasonId=...` (o `--slug=...`) que:
  1. Lee `SeasonMobileConfig` de la DB.
  2. Crea `apps/mobile/editions/<slug>/edition.config.ts` + carpeta `assets` copiando placeholders del piloto.
  3. Registra la key en `apps/mobile/src/lib/edition.ts`.
  4. Imprime los comandos EAS (`EDITION=<slug> npx eas build ...`) y el checklist de tiendas.
- Doc `docs/operations/mobile-edition.md`: bundle id convention `cl.admintorneo.<orgSlug>.<seasonKey>`, scheme, splash, privacidad (`/privacidad/app` global).
- Tests: slug, publish guards, API 404 si unpublished; test del script en dry-run con filesystem mock.

### Excluido

- EAS Submit, Fastlane, cuentas de desarrollador por cliente.
- Dominio custom o app con login.
- Cambiar paths `/api/mobile/v1/leagues/[slug]/*`.
- Generar íconos con IA ni pipeline de assets más allá de copiar placeholder + usar logo ya subido (el logo de la edición sigue en Storage; el ícono nativo se pega a mano en `assets` en v1).
- Amistosos / desafíos en la app (sigue solo `MatchType.LEAGUE` de esa temporada).
- Multi-edición en un mismo binario.

## 4. Arquitectura

```text
ORG_ADMIN
  Season + SeasonMobileConfig (web CMS)
       │
       │  isPublished
       ▼
  GET /api/mobile/v1/leagues/:slug/*     ← ya existe, scoped por season.organizationId interno
       ▲
Expo edition (binario)
  edition.config.ts (slug, bundle, apiBaseUrl, supabase anon)
  EDITION=<slug> eas build

Platform
  /plataforma/apps  ← inventario
Script
  create-mobile-edition.ts  ← scaffolding en el repo
```

| Unidad | Qué hace | Cómo se usa | Depende de |
|--------|----------|-------------|------------|
| `SeasonMobileConfig` | Identidad de edición (ya existe) | CMS + API pública | Season → Organization |
| Wizard mobile | Alta/edición/publicar | Admin contenido | org-scope |
| `scripts/create-mobile-edition.ts` | Carpeta Expo + registro | Dev local / CI manual | Prisma, filesystem |
| `/plataforma/apps` | Inventario | Platform admin | SeasonMobileConfig |

## 5. Modelo de datos

Sin tablas nuevas. Se usan campos existentes de `SeasonMobileConfig`.

Reglas nuevas de producto (en código, no migración):

- `slug` inmutable tras crear (igual que org slug). Editar nombre/colores/logo sí.
- Convención de slug sugerida: `{orgSlug}-{temporada-normalizada}` ej. `kelme-invierno-puerto-varas-2026`. El admin puede escribir otro si cumple el regex.
- Bundle id **no** se guarda en Postgres en v1 (vive en `edition.config.ts`). El wizard muestra un **preview de convención** `cl.admintorneo.{orgSlug}.{slugSanitizado}` para copiar al script / EAS.

Opcional documentado, no en schema: comentario en `edition.config.ts` con `seasonId` y `organizationSlug` para no perder el vínculo repo↔DB.

## 6. Permisos

- ORG_ADMIN: CRUD config de temporadas de **su** org. No ve configs de otras.
- Platform: lista todas; no edita branding de la org (eso es del ORG_ADMIN). No hay “publicar en tienda”.
- Público: API solo si `isPublished`.

## 7. Rutas

| Ruta | Uso |
|------|-----|
| `/{slug}/admin/seasons/[id]/mobile` | Ya existe página parcial; se convierte en wizard completo |
| `PUT /api/admin/seasons/[id]/mobile` | Ya existe upsert; se añade inmutabilidad de slug y guards de publish |
| `/plataforma/apps` | Inventario |
| `GET /api/plataforma/mobile-editions` | JSON para esa UI |

No se crean rutas móviles nuevas.

## 8. UX

- En contenido / temporada: tarjeta “App de esta edición” con estado Publicado / Borrador, slug, y checklist: logo, equipos inscritos, noticias opcionales.
- Publicar: confirmación “La API pública quedará abierta con este slug. La app de tienda se genera aparte.”
- Plataforma: tabla org | temporada | slug | publicado | “Scaffold pendiente” (texto de ayuda, no un boolean mágico).

Copy: “App de esta temporada”, “Publicar edición”, “El slug no se puede cambiar después”.

## 9. Script de scaffolding

Entrada: `--slug` (config debe existir y estar published o no, da igual).

Salida:

- `apps/mobile/editions/<slug>/edition.config.ts`
- `apps/mobile/editions/<slug>/assets/` (icon, splash, adaptive-icon copiados del piloto)
- Patch de `EDITIONS` en `apps/mobile/src/lib/edition.ts`

Colores desde `SeasonMobileConfig` o fallback a colores de `Organization`. `apiBaseUrl` desde env `PUBLIC_APP_URL` o default prod. Keys de Supabase desde env del desarrollador, no hardcode secretas.

Si la carpeta ya existe → exit 1 sin overwrite, salvo `--force`.

## 10. Errores

- Slug reservado o tomado → 400/409.
- Publicar sin logo o sin equipos → 400.
- Cambiar slug existente → 400.
- Script sin config en DB → exit 1.
- Org pausada: API móvil 503 coherente con live (si no lo está hoy, **sí se añade** en esta entrega: `Season.organization.status === PAUSED` → 503 en GET móviles).

## 11. Pruebas

- Upsert mobile: segundo PUT no cambia slug.
- Publish sin `SeasonTeam` → 400.
- GET liga unpublished → 404; published → 200.
- GET liga de org pausada → 503.
- ORG_ADMIN no lee config de otra org.
- Script dry-run escribe paths esperados (tests con tmp dir).
- El piloto `liga-invierno-kelme-puerto-varas-2026` sigue compilando con `EDITION` actual.

## 12. Relación con el piloto

Kelme Invierno 2026 **no se regenera**. El script es para la **siguiente** edición (otra temporada Kelme u otra empresa). El doc de operaciones explica cómo clonar el proyecto EAS (nuevo `eas.json` profile por edition key).

## 13. Fuera de discusión en implementación

No se cambia el set de pantallas de la app (tabs, favoritos, notificaciones). No se mezclan amistosos. No se automatiza la review de Apple/Google.
