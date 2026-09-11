# Kelme Cup Los Lagos 2026 — edición móvil

> Estado: **Diseño aprobado en sesión**
> Fecha: 2026-09-11
> Producto: **LigaLab**
> Org: **Torneos Kelme** (`slug: kelme`)
> Depende de: [app móvil por temporada](./2026-08-14-app-movil-por-temporada-design.md), [Copa Kelme Los Lagos](./2026-08-31-copa-kelme-los-lagos-design.md), landing flyer Kelme Cup (`src/lib/org-brand.ts`)
> Plan: se escribe en `docs/superpowers/plans/2026-09-11-kelme-cup-mobile-edition.md` después de aprobar esta spec

---

## 1. Objetivo

Dejar **lista** la edición móvil de la Kelme Cup (torneo infantil Los Lagos, 25 oct 2026): `SeasonMobileConfig` publicada y carpeta Expo compilable.

No es un producto nuevo. Es **una instancia** del flujo ya aprobado: config en admin → API pública → `create-mobile-edition.ts`. El piloto Invierno **no se regenera ni se rebrandea**.

Alcance elegido: **edición + carpeta Expo**. Sin build EAS, sin TestFlight, sin App Store ni Google Play.

---

## 2. Decisiones

| Tema | Elección |
|------|----------|
| Qué app | App **nueva** Kelme Cup (azul flyer). No reutilizar Invierno. No super-app “Torneos Kelme”. |
| Temporada | La existente **Copa Kelme Los Lagos** (`CUP_SEASON_NAME` en `src/lib/copa-kelme-los-lagos.ts`). No crear otra temporada. |
| Slug de edición | `kelme-cup-los-lagos-2026` (global, inmutable, distinto del slug de org `kelme`) |
| Nombre | Display: `Kelme Cup Los Lagos 2026`. Corto: `Kelme Cup` |
| Descripción | Torneo infantil Los Lagos, 25 oct, Colegio Puerto Varas, 9:00–14:00. Copy alineada a `KELME_CUP` |
| Colores | Primario `#1A7AE8`, secundario `#0B3D8F` (`KELME_CUP_PRIMARY` / `KELME_CUP_SECONDARY`) |
| Logo CMS | Escudo `public/branding/kelme-cup-shield.png` subido a `SeasonMobileConfig.logoStoragePath` |
| Bundle / package | `cl.admintorneo.kelme.kelmecuploslagos2026` (convención actual, no el id legacy de Invierno) |
| URL scheme | `kelmecuploslagos2026` |
| `apiBaseUrl` | `https://ligalab.cl` (canónico). Alias `https://torneos-kelme.vercel.app` sigue válido |
| Carpeta Expo | `apps/mobile/editions/kelme-cup-los-lagos-2026/` |
| Assets nativos | Tras el scaffold, reemplazar placeholders rojos de Invierno por el escudo Cup (icon, splash, adaptive-icon) |
| Publicar API | `isPublished=true` cuando haya logo + ≥1 `SeasonTeam` `REGISTERED` |
| Invierno | No tocar `apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026/` ni su registro |

### Alternativas descartadas

1. **Reusar la app Invierno** (rojo, bundle `cl.kelme.ligainvierno.puertovaras2026`). Mezcla torneos y rompe el historial de tienda.
2. **Una app “Torneos Kelme” multi-temporada.** Contradice la spec 2026-08-14.
3. **EAS + tiendas en esta entrega.** Cuentas, capturas y review quedan para un trabajo aparte.

---

## 3. Arquitectura

Sin tablas, rutas ni pantallas Expo nuevas.

```text
ORG_ADMIN / script de ops
  Season "Copa Kelme Los Lagos" (org kelme)
    └── SeasonMobileConfig slug=kelme-cup-los-lagos-2026  isPublished=true
              │
              ▼
  GET /api/mobile/v1/leagues/kelme-cup-los-lagos-2026/*
              ▲
Expo
  apps/mobile/editions/kelme-cup-los-lagos-2026/edition.config.ts
  EDITION=kelme-cup-los-lagos-2026  (compilable; build de tienda fuera de alcance)
```

| Unidad | Qué hace | Cómo se usa | Depende de |
|--------|----------|-------------|------------|
| Temporada copa | Fixture/equipos de la Cup | Seed o admin existente | Org `kelme` |
| `SeasonMobileConfig` | Identidad + publish | Admin ` /kelme/admin/seasons/[id]/mobile` o upsert equivalente | Season + logo + ≥1 equipo |
| API móvil v1 | Fixture, tabla, live, noticias | Apps y smoke HTTP | `isPublished` + org activa |
| Scaffold Expo | `edition.config.ts` + assets + registro | `npx tsx scripts/create-mobile-edition.ts --slug=kelme-cup-los-lagos-2026` | Config en DB |
| Assets Cup | Ícono/splash azules | Reemplazo manual post-scaffold | `kelme-cup-shield.png` |

---

## 4. Datos y guards

- **Temporada:** si no existe en el ambiente (local y/o prod), sembrar con el flujo ya documentado (`npm run db:seed:copa-kelme-los-lagos`). No inventar otra season.
- **Equipos:** publicar exige al menos un `SeasonTeam` `REGISTERED`. Usar los equipos ya sembrados (placeholders Colo Colo / Católica / Unión / FV están bien para abrir la API; los nombres reales se corrigen después en admin).
- **Slug:** regex de edición existente; no puede ser un slug de org reservado; único global; inmutable tras el primer guardado.
- **Logo:** el publish guard lee `logoStoragePath`. Hay que subir el escudo; no basta con el PNG estático de `/branding/`.
- **Org pausada:** la API sigue respondiendo 503 (comportamiento actual). No se cambia.

Campos fijos de la config:

| Campo | Valor |
|-------|--------|
| `slug` | `kelme-cup-los-lagos-2026` |
| `displayName` | `Kelme Cup Los Lagos 2026` |
| `shortName` | `Kelme Cup` |
| `primaryColor` | `#1A7AE8` |
| `secondaryColor` | `#0B3D8F` |
| `isPublished` | `true` al cumplir guards |

---

## 5. Expo

El script existente:

1. Lee `SeasonMobileConfig` por slug (falla si no existe).
2. Crea `apps/mobile/editions/kelme-cup-los-lagos-2026/edition.config.ts`.
3. Copia assets del piloto Invierno como placeholder.
4. Registra la key en `apps/mobile/src/lib/edition.ts`.

Después del script, **obligatorio** en esta entrega:

- Reemplazar PNG de `assets/` por el escudo Cup (no dejar íconos rojos de Invierno).
- Ajustar `apiBaseUrl` default a `https://ligalab.cl` si el script escribió el alias viejo.
- Confirmar que Invierno sigue importado y no se regeneró.

No se añaden pantallas, login, ni amistosos en el binario. La app Cup consume solo partidos `LEAGUE` de esa temporada (contrato actual).

No se añade perfil EAS ni se corre `eas build`.

---

## 6. Verificación

- `GET /api/mobile/v1/leagues/kelme-cup-los-lagos-2026` y `GET /api/mobile/v1/leagues/kelme-cup-los-lagos-2026/home` → 200 en el ambiente publicado; 404 si `isPublished=false`.
- Invierno (`liga-invierno-kelme-puerto-varas-2026`) sigue 200 si ya estaba publicada.
- `edition.ts` exporta ambas keys.
- Tests existentes de slug / publish / API unpublished no se rompen. No se exigen tests de producto nuevos salvo que el scaffolding deje un registro sin cubrir.
- No se corre la suite móvil completa si ya está roja de antemano; sí se corren los tests tocados.

---

## 7. Fuera de alcance

- `eas build`, TestFlight, APK de tienda, EAS Submit.
- Cuentas App Store Connect / Google Play, capturas, review.
- Cambiar paths `/api/mobile/v1/leagues/[slug]/*`.
- Login en la app.
- Amistosos, desafíos, asistencia “¿Quién va?” en Expo.
- Regenerar o rebrandear el piloto Invierno.
- Sembrar planteles de niños reales.
- Landing web `/kelme` (ya está al estilo flyer).

---

## 8. Relación con specs previas

La spec 2026-08-31 dejó la app móvil **fuera** de la siembra de la copa. Esta entrega es ese follow-up.

La spec 2026-08-14 sigue siendo la fuente de verdad del producto (una app por temporada, sin submit automático). Aquí solo se instancia la Cup.
