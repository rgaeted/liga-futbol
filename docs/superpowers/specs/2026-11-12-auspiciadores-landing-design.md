# Auspiciadores en el landing de cada liga

Fecha: 2026-11-12

## Intención

Cada liga (organización) puede mostrar a sus auspiciadores en su landing público, y medir cuánta
atención reciben, para que el auspiciador quede contento y renueve. Nace con la Kelme Cup
(3 auspiciadores), pero debe servir a cualquier liga sin código específico.

## Objetivos

1. **Franja de logos** justo después del hero, con enlace al auspiciador.
2. **Tarjetas** con logo, frase u oferta y un botón (texto + enlace propios: WhatsApp, Instagram, web).
3. **Dos niveles**: `MAIN` (principal: primero, más grande, tarjeta destacada) y `OFFICIAL`.
4. **Canchas con nombre de auspiciador**: "Cancha 1 · Ferretería X" con logo chico, en las tarjetas
   de partido del landing.
5. **Definiciones presentadas**: Final, 3.er y 5.º puesto pueden tener auspiciador
   ("Final presentada por X"), solo si existen partidos con esa fase.
6. **Medición**: clics y vistas por auspiciador y por mes, visibles en el panel.

## No objetivos

- No se cambia la API móvil ni el uso actual de `placement` (HOME / SPONSORS_PAGE / FOOTER), que
  sigue siendo de la app.
- No hay cobro, contratos ni reportes descargables.
- No se guardan datos personales de quien ve o hace clic (sin IP, sin cookies, sin user agent).

## Anti-objetivos

- Que la sección aparezca vacía o rota en una liga sin auspiciadores: si no hay ninguno visible,
  no se renderiza nada.
- Que el contador sirva como redirector abierto: la ruta de clic solo redirige a URLs guardadas
  en el auspiciador.
- Que las vistas se inflen con el refresco automático del landing o con bots.

## Lo que ya existe y se reutiliza

- Modelo `Sponsor` (por temporada): nombre, logo, banner, `websiteUrl`, `placement`, vigencia
  (`startsAt`/`endsAt`), `isActive`, `sortOrder`. `isSponsorPubliclyVisible` aplica vigencia.
- Panel: Contenido → Patrocinadores (`/admin/content/sponsors?season=`), con `SponsorForm`,
  `SponsorsTable`, subida de logo/banner (R2/Supabase vía `uploadEditorialObject`) y la capacidad
  de plan `MANAGE_LEAGUE_CONTENT`.
- URLs públicas de imágenes: `editorialPublicUrl`.
- `Match.court` (Int?) y `Match.phase` (`MatchPhase`: GROUP, LEAGUE, FINAL, THIRD_PLACE, FIFTH_PLACE).

## Diseño

### Datos (migración aditiva)

`Sponsor` agrega:

- `tier SponsorTier @default(OFFICIAL)` — enum nuevo `SponsorTier { MAIN OFFICIAL }`.
- `tagline String?` (máx. 140) — frase u oferta.
- `ctaLabel String?` (máx. 40) y `ctaUrl String?` — botón de la tarjeta. `ctaUrl` acepta `https://`,
  `http://`, `https://wa.me/...`; sin botón si falta.
- `showOnLanding Boolean @default(false)` — aparece en el landing (independiente de la app).

Modelo nuevo `SponsorAssignment` (qué presenta cada auspiciador en una temporada):

```
id, seasonId, sponsorId, target String, createdAt
@@unique([seasonId, target])   // una cancha o fase tiene un solo auspiciador
target = "court:<n>" | "phase:FINAL" | "phase:THIRD_PLACE" | "phase:FIFTH_PLACE"
```

Un auspiciador puede tener varias asignaciones. Borrar el auspiciador borra sus asignaciones (cascade).

Modelo nuevo `SponsorMonthlyStat`:

```
sponsorId, month (DateTime, día 1 del mes en America/Santiago), views Int, clicks Int
@@id([sponsorId, month])
```

Se incrementa con `upsert` + `increment` (atómico, sin lecturas previas).

### Qué temporada alimenta el landing

El landing es por organización y los auspiciadores son por temporada. Regla: se usa la temporada
más reciente (por `startDate` desc) de la organización que tenga al menos un auspiciador visible con
`showOnLanding`. Las asignaciones de cancha/fase se resuelven con la temporada de cada partido.

### Landing (cualquier organización)

Una función de servidor `getLandingSponsors(organizationId)` devuelve
`{ main: [], official: [], assignments: Map<seasonId, Map<target, sponsorLite>> }` con URLs ya
resueltas. Se carga en `src/app/(tenant)/[organizationSlug]/page.tsx` junto al resto y se pasa a
`OrgPublicLanding`.

- **Franja**: tras el hero (en Kelme, tras la tarjeta de datos clave). Principales más grandes
  primero, luego oficiales por `sortOrder`. Logo en escala de grises que se colorea al pasar el
  mouse; si no hay logo, el nombre en texto.
- **Tarjetas**: sección "Nuestros auspiciadores" antes del cierre (en Kelme, antes de
  `KelmeCupInvite`). El principal ocupa el ancho completo en una tarjeta destacada; los oficiales en
  grilla. Cada tarjeta: logo, nombre, `tagline`, botón `ctaLabel` → `ctaUrl`.
- **Cancha**: donde se muestre la cancha de un partido (hoy `KelmeCupFixture`; y en las tarjetas de
  partido del landing genérico cuando `match.court` exista) la píldora dice
  "Cancha N · Auspiciador" con logo de 16 px.
- **Definiciones**: tarjeta de partido con fase asignada muestra "Final presentada por X" con logo.
- Todos los enlaces a auspiciadores pasan por la ruta de clic, con `rel="sponsored noopener"` y
  `target="_blank"`.

### Medición

- **Clic**: `GET /api/public/sponsors/[sponsorId]/click?to=cta|web` (ruta pública agregada a `isPublicRequest` en `src/lib/proxy-policy.ts`) → incrementa `clicks` del mes y responde 302 a
  `ctaUrl` o `websiteUrl` del auspiciador (si `to=cta` y no hay `ctaUrl`, usa `websiteUrl`; si no hay
  ninguno, 302 al landing de la organización). Solo auspiciadores visibles. No cuenta si el
  user agent parece bot (regex simple: bot|crawl|spider|preview|facebookexternalhit|whatsapp).
- **Vista**: un componente cliente, una vez por carga de página, envía
  `POST /api/public/sponsors/views` (también pública en `isPublicRequest`) con `{ organizationSlug, sponsorIds }`. Se deduplica por pestaña con
  `sessionStorage` (envuelto en try/catch) para que el refresco automático no sume. El servidor
  valida que los ids sean auspiciadores visibles de esa organización y limita a 20 ids.
- Nada de esto guarda datos de la persona.

### Panel (Contenido → Patrocinadores)

- `SponsorForm` agrega: nivel (Principal / Oficial), "Mostrar en el landing", frase u oferta, texto
  del botón y enlace del botón.
- Sección nueva "Canchas y definiciones": una fila por cancha usada en los partidos de la temporada
  (números distintos de `Match.court`) y una por cada fase de definición existente en la temporada;
  cada fila con un selector de auspiciador (o "Sin auspiciador"). Guardado por fila.
- `SponsorsTable` agrega columnas: nivel, landing (sí/no), vistas y clics del mes actual y del
  anterior.
- Mismas reglas de acceso que hoy: `requireAdminSeason` + `MANAGE_LEAGUE_CONTENT`.

## Restricciones

- Next.js 16 del repo (leer `node_modules/next/dist/docs/` antes de escribir rutas/páginas).
- Migración aditiva, verificada con `prisma migrate diff`; se aplica en el build de Vercel
  (`prisma migrate deploy`).
- Textos en es-CL con tú; fechas con `APP_LOCALE`.
- La Kelme Cup debe quedar igual si no se cargan auspiciadores.
- Despliegue a producción solo con autorización explícita.

## Decisiones tomadas por Claude (revisables)

- Dos niveles (Principal/Oficial), no más.
- `showOnLanding` parte en `false` para no publicar de golpe los auspiciadores existentes de la app.
- Vistas medidas desde el cliente con deduplicación por pestaña; clics por redirección propia.
- Logos en escala de grises en la franja.
- Agregación mensual (no por día).

## Lo que queda al implementador

Estilos exactos de franja y tarjetas dentro de la paleta de cada landing (Kelme azul; genérico usa
`org-primary`), tamaños de logo, y manejo de errores de red del envío de vistas (silencioso).
