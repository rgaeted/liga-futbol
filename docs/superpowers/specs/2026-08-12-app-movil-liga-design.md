# Aplicación móvil pública por edición de liga — Design Spec

> Estado: **Diseño aprobado**
> Fecha: 2026-08-12
> Edición inicial de referencia: **Liga de Invierno Kelme Puerto Varas 2026**

---

## 1. Objetivo

Crear una aplicación móvil pública para iOS y Android, publicada de forma independiente para cada edición de una liga administrada en Torneos Kelme.

La primera aplicación permitirá consultar:

- partidos en vivo, próximos partidos y resultados;
- fixture y tabla de posiciones;
- goleadores, asistencias, tarjetas y MVP;
- equipos, planteles y perfiles de jugadores;
- noticias, galerías y auspiciadores;
- notificaciones de inicio, goles y final para equipos favoritos.

El sitio web actual seguirá siendo la única fuente de verdad y el único panel de administración.

## 2. Decisiones aprobadas

- La aplicación será pública y no requerirá cuenta.
- Cada edición o temporada tendrá una app independiente en App Store y Google Play.
- Una edición terminada quedará disponible como archivo histórico.
- Se usará una plantilla compartida Expo/React Native.
- Un desarrollador configurará y publicará cada nueva app; no habrá publicación automática desde el panel.
- Cada app quedará vinculada a una temporada mediante un `slug` público e inmutable.
- El panel web administrará datos deportivos, branding de contenido, noticias, galerías y auspiciadores.
- La identidad nativa —nombre en tienda, bundle/package ID, ícono y splash— se configurará en el proyecto móvil.
- La app consumirá una API pública versionada de Next.js. No accederá directamente a Prisma ni a Supabase.
- Los favoritos y preferencias se guardarán en el dispositivo, sin sincronización entre equipos.
- El usuario podrá seguir uno o más equipos para recibir notificaciones.
- Los planteles se guardarán por temporada para preservar el historial.
- Las imágenes editoriales se almacenarán en Supabase Storage, no como bytes en PostgreSQL.

## 3. Alcance del MVP

### 3.1 Navegación principal

La barra inferior tendrá cinco accesos:

1. **Inicio**
   - identidad de la edición;
   - partido en vivo destacado;
   - próximos partidos;
   - últimos resultados;
   - noticias recientes;
   - auspiciadores.
2. **Partidos**
   - fixture por fecha;
   - próximos;
   - resultados;
   - acceso al detalle y marcador en vivo.
3. **Tabla**
   - posición, PJ, PG, PE, PP, GF, GC, DG y puntos.
4. **Estadísticas**
   - goleadores;
   - asistencias;
   - tarjetas;
   - MVP.
5. **Más**
   - equipos y planteles;
   - galería;
   - todas las noticias;
   - información de la liga;
   - auspiciadores.

### 3.2 Pantallas de detalle

**Partido**

- fecha y hora en `America/Santiago`;
- cancha, comuna y región cuando existan;
- equipos, escudos y colores;
- clima cuando exista;
- marcador, estado y reloj;
- cronología;
- formaciones;
- MVP.

**Equipo**

- escudo y color;
- plantel inscrito en la edición;
- próximos partidos;
- resultados.

**Jugador**

- nombre y foto cuando exista;
- equipo y posición en la edición;
- goles, asistencias, tarjetas y MVP de esa temporada.

**Contenido**

- detalle de noticia;
- álbum de galería;
- ficha o enlace de auspiciador.

### 3.3 Primera apertura

1. Mostrar una presentación breve de la edición.
2. Permitir seguir uno o más equipos o continuar sin selección.
3. Explicar el uso de notificaciones.
4. Solicitar el permiso del sistema.
5. Guardar preferencias localmente.

La aplicación debe seguir funcionando si el usuario rechaza las notificaciones.

## 4. Arquitectura

### 4.1 Responsabilidades

**Sitio web Next.js**

- autenticación y autorización administrativa;
- edición de temporadas, equipos, planteles, partidos y contenido;
- reglas de negocio;
- API pública móvil;
- cálculo de tabla y estadísticas;
- creación y procesamiento de notificaciones;
- publicación de invalidaciones realtime.

**Aplicación Expo/React Native**

- presentación y navegación;
- caché local;
- selección local de favoritos;
- registro anónimo del dispositivo;
- suscripción realtime del partido abierto;
- recepción y apertura de notificaciones;
- enlaces internos hacia partidos, equipos, jugadores y noticias.

**Supabase**

- PostgreSQL como persistencia;
- Realtime para invalidaciones;
- Storage para noticias, galerías, logos editoriales y auspiciadores.

**Expo**

- builds iOS/Android mediante EAS;
- credenciales y canales por edición;
- Expo Push Service para notificaciones.

### 4.2 Flujo de lectura

1. La app conoce el `slug` de su edición mediante configuración de build.
2. Consulta la configuración pública de la temporada.
3. Consume recursos bajo `/api/mobile/v1/leagues/[slug]`.
4. TanStack Query conserva la última respuesta válida.
5. En un partido live, Supabase emite una invalidación.
6. La app vuelve a consultar el snapshot del partido.
7. Un polling de respaldo evita depender únicamente de Realtime.

### 4.3 Estructura móvil

Se usará:

- Expo y React Native;
- TypeScript;
- Expo Router;
- TanStack Query;
- Expo Notifications;
- almacenamiento local para onboarding y favoritos.

La plantilla tendrá configuraciones por edición con:

- slug de temporada;
- nombre visible;
- bundle ID de iOS;
- package name de Android;
- ícono;
- splash;
- canales y perfiles EAS.

Los secretos y credenciales de Apple, Google y Expo no se guardarán en Git.

## 5. Modelo de datos

Los modelos nuevos serán los descritos en esta sección.

### 5.1 Configuración pública

`SeasonMobileConfig`, relación uno a uno con `Season`:

- `seasonId`;
- `slug`, único e inmutable una vez publicada la app;
- `displayName`;
- `shortName`;
- `description`;
- `logoStoragePath`;
- `primaryColor`;
- `secondaryColor`;
- `isPublished`;
- `publishedAt`;
- timestamps.

Los identificadores de tienda, ícono y splash no pertenecen a este modelo porque forman parte del build nativo.

### 5.2 Inscripción histórica

`SeasonTeam`:

- `seasonId`;
- `teamId`;
- nombre, color y escudo efectivos para esa edición cuando se requiera snapshot;
- estado de inscripción;
- orden opcional;
- unicidad por temporada y equipo.

`SeasonRosterEntry`:

- `seasonTeamId`;
- `playerId`;
- dorsal opcional;
- posición opcional;
- estado activo;
- unicidad por equipo de temporada y jugador.

Los partidos de liga deben referenciar equipos inscritos en su temporada. `Player.teamId` puede mantenerse durante la transición para compatibilidad con los flujos actuales, pero la API móvil leerá el roster histórico.

### 5.3 Contenido editorial

`Article`:

- temporada;
- título, resumen y cuerpo;
- portada en Storage;
- estado `DRAFT` o `PUBLISHED`;
- fecha de publicación;
- autor administrador.

`Gallery`:

- temporada;
- título, descripción y portada;
- estado y fecha de publicación;
- orden.

`GalleryPhoto`:

- galería;
- archivo en Storage;
- texto alternativo;
- pie de foto;
- orden.

`Sponsor`:

- temporada;
- nombre;
- logo o banner en Storage;
- URL opcional;
- nivel o ubicación;
- vigencia;
- estado activo;
- orden.

### 5.4 Instalaciones y favoritos

`MobileInstallation`:

- identificador opaco generado por la app;
- slug o temporada;
- token Expo;
- plataforma;
- versión de app;
- estado activo;
- última actividad;
- timestamps.

`TeamSubscription`:

- instalación;
- equipo inscrito en la temporada;
- preferencias para inicio, goles y final;
- unicidad por instalación y equipo.

No se almacenará información de cuenta ni se exigirá correo electrónico.

### 5.5 Bandeja de notificaciones

`NotificationOutbox`:

- temporada y partido;
- tipo `MATCH_START`, `GOAL` o `MATCH_FINISH`;
- equipo relacionado cuando corresponda;
- identificador del evento de partido cuando corresponda;
- payload serializable;
- estado `PENDING`, `PROCESSING`, `SENT` o `FAILED`;
- intentos, próximo reintento y último error;
- clave de deduplicación única;
- timestamps.

`NotificationDelivery`:

- notificación de outbox;
- instalación;
- estado `PENDING`, `SENT`, `FAILED` o `INVALID_TOKEN`;
- identificador entregado por Expo cuando exista;
- intentos y último error;
- timestamps;
- unicidad por notificación e instalación.

Esta unicidad impedirá que un reintento envíe el mismo evento dos veces al mismo dispositivo.

## 6. API móvil

La API se versionará bajo `/api/mobile/v1`. Todas las respuestas deben:

- usar contratos serializables y estables;
- aplicar el scope de la temporada resuelta por slug;
- exponer solo temporadas publicadas;
- excluir borradores;
- paginar colecciones grandes;
- entregar fechas ISO y dejar el formateo visible a `es-CL`;
- evitar campos administrativos o datos sensibles.

### 6.1 Lectura pública

- `GET /api/mobile/v1/leagues/[slug]`
- `GET /api/mobile/v1/leagues/[slug]/home`
- `GET /api/mobile/v1/leagues/[slug]/matches`
- `GET /api/mobile/v1/leagues/[slug]/matches/[matchId]`
- `GET /api/mobile/v1/leagues/[slug]/matches/[matchId]/live`
- `GET /api/mobile/v1/leagues/[slug]/standings`
- `GET /api/mobile/v1/leagues/[slug]/stats`
- `GET /api/mobile/v1/leagues/[slug]/teams`
- `GET /api/mobile/v1/leagues/[slug]/teams/[seasonTeamId]`
- `GET /api/mobile/v1/leagues/[slug]/players/[rosterEntryId]`
- `GET /api/mobile/v1/leagues/[slug]/articles`
- `GET /api/mobile/v1/leagues/[slug]/articles/[articleId]`
- `GET /api/mobile/v1/leagues/[slug]/galleries`
- `GET /api/mobile/v1/leagues/[slug]/galleries/[galleryId]`
- `GET /api/mobile/v1/leagues/[slug]/sponsors`

El snapshot live existente puede reutilizar su lógica interna, pero el endpoint móvil debe verificar que el partido pertenece a la temporada indicada.

### 6.2 Registro anónimo

- `POST /api/mobile/v1/leagues/[slug]/installations`
- `PUT /api/mobile/v1/leagues/[slug]/installations/[installationId]/subscriptions`
- `DELETE /api/mobile/v1/leagues/[slug]/installations/[installationId]`

Estos endpoints deben validar formato, limitar frecuencia y no aceptar equipos de otra temporada.

### 6.3 Administración web

El panel administrativo incorporará:

- configuración y publicación móvil de una temporada;
- inscripción de equipos y roster por temporada;
- CRUD de noticias;
- CRUD de galerías y fotos;
- CRUD de auspiciadores;
- vista del estado de publicación;
- diagnóstico básico de notificaciones.

Toda escritura seguirá protegida con rol `ADMIN`.

## 7. Tabla y estadísticas

La tabla se calculará únicamente con partidos `LEAGUE` de la temporada:

- no incluir partidos programados ni cancelados;
- contar solo resultados finalizados según las reglas actuales;
- asignar tres puntos por triunfo, uno por empate y cero por derrota;
- ordenar con los siguientes criterios, en este orden:

1. puntos;
2. diferencia de goles;
3. goles a favor;
4. nombre del equipo como desempate estable.

Las estadísticas individuales se calcularán desde `MatchEvent` y `MatchTeamMvp`, filtrando por temporada. No se deben usar directamente los acumulados globales de `Player`, porque mezclan temporadas.

## 8. Realtime y notificaciones

### 8.1 Marcador en vivo

- Reutilizar el canal `match:{matchId}` y el evento de invalidación.
- Refrescar el snapshot con debounce.
- Mantener polling de respaldo mientras el estado sea `LIVE` o `HALFTIME`.
- Mostrar cuándo la información puede estar desactualizada.
- Permitir reintento manual.

### 8.2 Generación de avisos

Al registrar un gol o cambiar el partido a iniciado/finalizado:

1. guardar primero el cambio deportivo;
2. crear una entrada de outbox con clave única;
3. confirmar la operación;
4. procesar la outbox fuera de la respuesta interactiva;
5. seleccionar instalaciones activas suscritas al equipo;
6. enviar mediante Expo Push Service;
7. registrar resultados;
8. reintentar errores temporales;
9. desactivar tokens declarados inválidos.

Un gol notificará a seguidores del equipo que anotó. Inicio y final notificarán a seguidores de cualquiera de los dos equipos.

Cada notificación incluirá un deep link al detalle del partido.

## 9. Caché, offline y manejo de errores

- Mostrar inmediatamente la última respuesta válida cuando exista.
- Indicar datos desactualizados sin bloquear la navegación.
- Diferenciar estado vacío, falta de conexión y error del servidor.
- Mantener el contenido principal navegable sin notificaciones.
- Usar escudo generado o iniciales si falta una imagen.
- Reintentar consultas idempotentes con límites.
- No reintentar automáticamente validaciones rechazadas.
- Mostrar mensajes en español chileno y nunca errores internos.
- Las fallas de push no deben revertir goles ni cambios de estado.
- Las cargas de archivos deben validar tipo y tamaño.

## 10. Seguridad y privacidad

- La app no contendrá credenciales de base de datos ni secretos administrativos.
- La API pública expondrá únicamente datos necesarios para espectadores.
- Las rutas móviles deben validar el scope por slug en cada consulta.
- Borradores, tokens push y datos operativos nunca aparecerán en respuestas públicas.
- El registro de instalaciones tendrá rate limiting.
- Los identificadores de instalación serán aleatorios y revocables.
- Se publicará una política de privacidad antes de enviar la app a revisión.
- La app explicará el uso de notificaciones antes de pedir permiso.
- Eliminar una instalación desactivará su token y sus suscripciones.

## 11. Accesibilidad, idioma y diseño

- UI y textos en español chileno.
- Fechas con `APP_LOCALE`/`es-CL` y zona `America/Santiago`.
- Contraste suficiente para colores configurables.
- Tamaños de toque adecuados.
- Compatibilidad con tamaños de texto del sistema.
- Texto alternativo en imágenes editoriales.
- Los estados no dependerán exclusivamente del color.
- La identidad visual de cada edición conservará una estructura de navegación consistente.

## 12. Pruebas

### 12.1 Dominio y API

- tabla y desempates;
- estadísticas aisladas por temporada;
- roster histórico;
- aislamiento entre slugs;
- exclusión de borradores;
- paginación;
- validación de instalación y suscripciones;
- deduplicación de outbox y entregas;
- desactivación de tokens inválidos.

### 12.2 Aplicación móvil

- onboarding y selección de favoritos;
- navegación principal y deep links;
- fixture, tabla, estadísticas y contenido;
- caché con conexión inestable;
- estados vacíos y errores;
- invalidación realtime y polling;
- recepción y apertura de push;
- accesibilidad básica.

### 12.3 Validación de publicación

- build de desarrollo;
- pruebas internas Android/iOS;
- TestFlight;
- Google Play internal testing;
- datos reales de la edición;
- íconos, splash, permisos y políticas;
- smoke test posterior a publicación.

## 13. Estrategia de entrega

La implementación se dividirá en hitos:

1. base multi-edición: configuración pública, inscripción histórica y API deportiva;
2. aplicación Expo con navegación, fixture, tabla, estadísticas, equipos y live;
3. CMS simple y consumo de noticias, galería y auspiciadores;
4. instalaciones anónimas, favoritos, outbox y notificaciones;
5. endurecimiento, pruebas de tiendas y publicación piloto.

Una edición nueva reutilizará la plantilla. El desarrollador:

1. crea su configuración de build;
2. agrega ícono y splash;
3. define bundle/package IDs;
4. vincula el slug publicado;
5. crea credenciales EAS;
6. ejecuta builds;
7. completa fichas y revisión de tiendas.

## 14. Fuera de alcance

- autenticación de público;
- sincronización de favoritos entre dispositivos;
- funciones de jugador, DT, árbitro o administrador en la app;
- edición de partidos desde el teléfono;
- chat o comentarios;
- compra de entradas;
- pagos;
- transmisión de video;
- publicación automática en tiendas;
- aplicación única con selector de múltiples ligas;
- reutilización de la misma app para temporadas futuras;
- amistosos dentro de la primera app de liga.

## 15. Criterios de aceptación

El MVP estará listo cuando:

- una app de prueba quede fijada a una temporada publicada;
- no muestre datos de otra temporada;
- permita consultar todas las secciones definidas;
- el live se actualice por Realtime con polling de respaldo;
- tabla y estadísticas coincidan con los eventos de esa edición;
- equipos y planteles permanezcan históricos;
- el admin pueda publicar noticias, galerías y auspiciadores;
- un usuario pueda seguir equipos sin crear cuenta;
- inicio, goles y final generen una sola notificación por evento;
- una notificación abra el partido correcto;
- la app conserve datos útiles durante una caída breve de red;
- los builds internos de iOS y Android superen los smoke tests.
