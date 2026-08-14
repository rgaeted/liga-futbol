# App móvil por temporada — checklist de operaciones

Guía para sacar una nueva edición Expo a App Store y Google Play a partir de una `SeasonMobileConfig` publicada en AdminTorneo.

## 1. Configurar la edición en el panel

1. Entra a `/{organizationSlug}/admin/seasons/[id]/mobile`.
2. Define slug, nombre visible, colores y descripción.
3. Guarda la configuración (el slug queda **inmutable** desde el primer guardado).
4. Inscribe al menos **un** equipo en la temporada (`SeasonTeam` en estado `REGISTERED`).
5. Sube el logo de la edición en `/{organizationSlug}/admin/content`.
6. Marca **Publicar edición móvil**. La API pública quedará abierta en `/api/mobile/v1/leagues/{slug}/*`. La app de tienda se genera aparte con el script de abajo.

## 2. Generar la carpeta Expo

Desde la raíz del repo:

```bash
npx tsx scripts/create-mobile-edition.ts --slug=<slug-de-la-edicion>
```

Si la carpeta ya existe y quieres sobrescribir:

```bash
npx tsx scripts/create-mobile-edition.ts --slug=<slug> --force
```

El script:

- Lee `SeasonMobileConfig` y la organización desde la base de datos.
- Crea `apps/mobile/editions/<slug>/edition.config.ts`.
- Copia placeholders de assets desde el piloto Kelme.
- Registra la edición en `apps/mobile/src/lib/edition.ts`.

**No ejecutes este script contra el piloto** `liga-invierno-kelme-puerto-varas-2026`; esa carpeta ya está en producción y no debe regenerarse.

## 3. Identificador nativo (bundle id / package)

Convención usada en `edition.config.ts`:

```text
cl.admintorneo.<organizationSlug>.<seasonKey>
```

Donde `seasonKey` es el slug de la edición sin guiones ni caracteres especiales (solo `[a-z0-9]`).

Ejemplo: org `kelme`, edición `kelme-verano-2027` → `cl.admintorneo.kelme.kelmeverano2027`.

El wizard del admin muestra un preview de este valor antes de publicar.

## 4. Assets nativos

1. Revisa `apps/mobile/editions/<slug>/assets/` (icon, splash, adaptive-icon copiados como placeholder).
2. Reemplaza los PNG con el branding final de la edición (ícono cuadrado, splash y adaptive icon para Android).
3. El logo de la edición en Storage alimenta la API web/móvil; los assets nativos se pegan a mano en v1.

## 5. Compilar con EAS

Añade un perfil en `apps/mobile/eas.json` keyed por la edition key (slug), luego:

```bash
cd apps/mobile
EDITION=<slug> npx eas build --platform ios
EDITION=<slug> npx eas build --platform android
```

Variables de entorno del desarrollador (no commitear secretos):

- `EXPO_PUBLIC_API_BASE_URL` — host AdminTorneo (prod: `https://torneos-kelme.vercel.app` o `PUBLIC_APP_URL`).
- `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Realtime del proyecto Supabase.

## 6. Privacidad y tiendas

- URL de privacidad global: `https://torneos-kelme.vercel.app/privacidad/app`
- App Store Connect / Google Play Console: crear app nueva por edición, bundle id/package del paso 3, capturas y metadatos fuera del repo.

## 7. Comportamiento de la API pública

| Estado | Respuesta móvil |
|--------|-----------------|
| Edición no publicada (`isPublished=false`) | 404 |
| Organización pausada | 503 — `Organización no disponible` |
| Publicada y org activa | 200 |

Despublicar deja de servir la edición (404) sin borrar la config en la base de datos.

## 8. Inventario en plataforma

Platform admin: `/plataforma/apps` lista todas las ediciones (org, temporada, slug, publicado). El texto “Scaffold pendiente” es recordatorio operativo; ejecuta el script cuando corresponda generar la carpeta Expo.
