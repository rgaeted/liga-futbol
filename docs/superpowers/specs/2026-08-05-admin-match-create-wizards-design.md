# Wizards de creación de partidos (admin) — Design Spec

> Estado: **Pendiente de revisión del usuario**  
> Fecha: 2026-08-05  
> Decisiones previas:
> - Páginas separadas `/admin/matches/new` (liga) y `/admin/matches/new/friendly` (amistoso) — opción A
> - Convocatoria amistosa como paso extra del wizard — opción A
> - Presets de eventos en UI; sin duración ni nombre único de partido en schema — opción C
> - Borrador automático en `localStorage` — opción A
> - Enfoque: shell compartido + pasos específicos por tipo

---

## 1. Objetivo

Separar y rediseñar la creación de partidos en admin en **dos flujos claros** (liga vs amistoso), con UI tipo wizard (acordeón + resumen lateral), alineada a los mockups, sin tocar el diseño del live ni cambiar la API de creación.

Hoy ambos formularios viven apilados en `/admin/matches` (`MatchForm` + `FriendlyMatchForm`). Eso se reemplaza por:

1. Lista limpia con botones de acceso a cada wizard.
2. Wizard de liga en ruta dedicada.
3. Wizard de amistoso en ruta dedicada (incluye convocatoria/equipos).

---

## 2. Alcance

### Incluye

- Rutas nuevas: `/admin/matches/new` y `/admin/matches/new/friendly`
- Shell compartido: header, pasos acordeón, panel resumen, footer con CTA
- Wizard liga (4 pasos) y wizard amistoso (6 pasos)
- Presets de eventos del árbitro (Básico / Completo / Personalizado)
- Borrador automático en `localStorage` por tipo de partido
- Botones de creación en `/admin/matches` (lista sin formularios inline)
- Reutilizar pickers/helpers existentes (`ChileLocationPicker`, `MatchRefereeEventsPicker`, convocatoria/equipos amistosos)

### Fuera de alcance

- Campos nuevos en Prisma (`duration`, nombre único del partido, etc.)
- Persistencia de borrador en servidor
- Cambios a edición de partidos (`MatchActions` / tarjeta admin)
- Cambios al live, panel árbitro o APIs de eventos
- Migraciones de schema
- Auto-save real al backend

---

## 3. Navegación y páginas

| Ruta | Contenido |
|------|-----------|
| `/admin/matches` | Listado de tarjetas + botones **Crear partido** / **Crear amistoso** |
| `/admin/matches/new` | Wizard liga |
| `/admin/matches/new/friendly` | Wizard amistoso |

- Los formularios actuales dejan de renderizarse en la lista.
- `MatchForm.tsx` y `FriendlyMatchForm.tsx` se eliminan cuando los wizards absorban su lógica (sin dejar wrappers vacíos).
- Acceso solo ADMIN (misma protección del layout dashboard admin).

### Botones en lista

En el encabezado de `/admin/matches`:

- Primario rojo: **Crear partido** → `/admin/matches/new`
- Secundario / outline: **Crear amistoso** → `/admin/matches/new/friendly`

---

## 4. Layout compartido

Componente: `MatchCreateWizardShell`

```text
┌─────────────────────────────────────────────────────────────┐
│ [ícono]  Título                              Borrador ···  │
│          Subtítulo                                          │
├────────────────────────────────┬────────────────────────────┤
│ ① Paso abierto           [▼]   │  Resumen del partido       │
│    campos…                     │  Temporada / Local / …     │
│                                │                            │
│ ② Paso colapsado         [▶]   │  Ubicación                 │
│ ③ …                            │  Eventos seleccionados     │
│                                │  [mensaje CTA]             │
├────────────────────────────────┴────────────────────────────┤
│                 [ Crear partido / Crear amistoso ]          │
│            Se guarda automáticamente como borrador          │
└─────────────────────────────────────────────────────────────┘
```

### Variantes visuales

| Tipo | Ícono header | Título | Badge |
|------|--------------|--------|-------|
| Liga | Escudo rojo / trofeo | Crear partido | — |
| Amistoso | Círculo verde + pelota | Crear partido amistoso | Badge verde **Amistoso** |

### Responsive

- Desktop: formulario a la izquierda (~2/3), resumen sticky a la derecha (~1/3).
- Móvil: columna única; resumen debajo de los pasos o colapsable; CTA sticky abajo.

### Comportamiento de pasos (acordeón)

- Un solo paso expandido a la vez (por defecto el primero).
- Click en header del paso → expandir ese y colapsar el resto.
- Pasos incompletos pueden abrirse; la validación fuerte es al crear (y, en amistoso, al avanzar a convocatoria/equipos cuando aplique).
- Numeración visual 1…N en círculo.

---

## 5. Wizard liga — 4 pasos

### 5.1 Datos del partido

| Campo | Requerido | Fuente |
|-------|-----------|--------|
| Temporada | Sí | `seasons[]` |
| Local | Sí | `teams[]` |
| Visitante | Sí | `teams[]` |
| Árbitro | No | `referees[]` |
| Fecha | Sí | input date (Chile) |
| Hora | Sí | input time (Chile) |
| Cancha | No | texto |

Nota: el tipo de fútbol se hereda de la temporada (igual que hoy). Se muestra como texto informativo en el paso o en el resumen.

### 5.2 Ubicación en Chile

- `ChileLocationPicker` (región + comuna), opcional.

### 5.3 Eventos del árbitro

- Selector de preset (Básico / Completo / Personalizado) + `MatchRefereeEventsPicker`.
- Default inicial: preset **Completo** (`DEFAULT_REFEREE_EVENT_TYPES`).

### 5.4 Resumen

- Vista de solo lectura de todos los campos + eventos elegidos.
- CTA principal del footer también crea; este paso es revisión.

### Payload (sin cambio)

```ts
POST /api/matches
{
  matchType: 'LEAGUE',
  seasonId, homeTeamId, awayTeamId,
  refereeId?, refereeEventTypes,
  venue?, regionCode?, communeCode?,
  scheduledAt // via scheduleInputToIso
}
```

---

## 6. Wizard amistoso — 6 pasos

### 6.1 Información general

| Campo | Requerido | Notas |
|-------|-----------|-------|
| Categoría amistosa | Sí | Solo activas; cambiar categoría limpia convocatoria |
| Nombre lado A | Sí | Equivale a “Local” en mockup |
| Nombre lado B | Sí | Equivale a “Visitante” |
| Árbitro | No | |
| Fecha / Hora | Sí | |
| Cancha | No | |

**No** se agrega campo “Nombre del partido amistoso” en schema. El título mostrado en resumen/listado sigue siendo `{sideAName} vs {sideBName}` (`matchDisplayName`).

### 6.2 Ubicación en Chile

Igual que liga.

### 6.3 Configuración del amistoso

| Campo UI | Mapeo real |
|----------|------------|
| Formato del partido | `footballFormat` (`FUTBOL_5`…`FUTBOL_11`) |
| Registro de eventos | Preset → `refereeEventTypes` (default **Completo**) |
| Banner informativo | Texto fijo: amistoso; stats no afectan competencia oficial |

**Fuera de esta versión (UI no persistida):**

- Duración (2 tiempos)
- Duración por tiempo (45 min)

No se muestran placeholders engañosos que parezcan guardables. Si el mockup los exige visualmente en una iteración futura, van en fase 2 con schema.

### 6.4 Convocatoria y equipos

Integra el flujo ya especificado en `2026-08-04-friendly-match-roster-wizard-design.md`:

1. Convocatoria (`FriendlyMatchConvocationPicker`) — ≥2 convocados.
2. Asignación A/B + capitán + DT (`FriendlyMatchTeamAssigner`).

Puede presentarse como **un solo paso del acordeón** con sub-secciones internas (convocar → repartir), reutilizando la lógica actual de `FriendlyMatchForm`.

Validaciones al crear: ≥1 por lado, capitán y DT en ambos lados.

### 6.5 Eventos del árbitro

- Picker prellenado según preset del paso 3.
- Si el usuario cambia checkboxes → preset pasa a **Personalizado**.

### 6.6 Resumen

Solo lectura de datos generales, ubicación, formato, conteo convocados/por lado, eventos, CTA crear.

### Payload (sin cambio)

```ts
POST /api/matches
{
  matchType: 'FRIENDLY',
  friendlyCategoryId, footballFormat,
  sideAName, sideBName,
  refereeId?, refereeEventTypes,
  venue?, regionCode?, communeCode?,
  scheduledAt,
  players: [{ friendlyPlayerId, side, isCaptain, isCoach }, ...]
}
```

---

## 7. Presets de eventos

Helper nuevo: `src/lib/match-referee-event-presets.ts`

| Preset | Comportamiento |
|--------|----------------|
| **Básico** | Control (inicio/entretiempo/final) + goles + tarjetas amarilla/roja |
| **Completo** | `DEFAULT_REFEREE_EVENT_TYPES` |
| **Personalizado** | Lo que el admin elija en el picker |

- Elegir Básico/Completo actualiza `refereeEventTypes`.
- Editar el picker manualmente marca Personalizado.
- Inicio / entretiempo / final siempre incluidos (regla existente de `normalizeRefereeEventTypes`).

Labels UI en español chileno: *Básico*, *Completo*, *Personalizado*.

---

## 8. Panel resumen (sidebar)

Componente: `MatchCreateSummary`

Secciones típicas:

1. **Resumen del partido** — temporada/categoría, local/visitante o lados, árbitro, fecha, hora, cancha, formato.
2. **Ubicación** — región / comuna (o “Sin ubicación”).
3. **Eventos seleccionados** — chips o conteo; si vacío medibles, mensaje “Aún no seleccionas eventos”.
4. Amistoso: **Plantel** — N convocados, conteo A/B, capitán/DT listos o pendientes.
5. Mensaje CTA breve al final del card.

Valores vacíos se muestran como `—`.

---

## 9. Borrador automático (`localStorage`)

Hook: `useMatchCreateDraft`

| Clave | Uso |
|-------|-----|
| `match-create-draft:league` | Wizard liga |
| `match-create-draft:friendly` | Wizard amistoso |

### Comportamiento

- Al montar: si hay borrador válido, restaurar estado del formulario.
- Al cambiar campos: debounce ~500 ms y guardar JSON + `savedAt`.
- Header: **Borrador guardado** + hora relativa (`es-CL`) cuando hay draft.
- Tras `POST` exitoso: borrar clave.
- Acción opcional en menú `···`: **Descartar borrador** (limpia storage y resetea form).

### Qué se guarda

- Todos los campos de formulario relevantes.
- Amistoso: también `convokedIds`, lados, capitán/DT, preset y eventos.
- **No** guardar secretos ni datos de sesión.

### Robustez

- JSON inválido o versión vieja → ignorar y empezar limpio.
- Campo `version: 1` en el payload del draft para migraciones futuras del formato.

---

## 10. Arquitectura de componentes

```text
src/components/admin/match-create/
  MatchCreateWizardShell.tsx     # layout header / grid / footer
  WizardStep.tsx                 # acordeón numerado
  MatchCreateSummary.tsx         # sidebar
  LeagueMatchCreateWizard.tsx    # estado + pasos liga
  FriendlyMatchCreateWizard.tsx  # estado + pasos amistoso
  useMatchCreateDraft.ts         # localStorage

src/lib/
  match-referee-event-presets.ts

src/app/(dashboard)/admin/matches/
  page.tsx                       # lista + botones (sin forms)
  new/page.tsx                   # server: carga seasons/teams/referees → League wizard
  new/friendly/page.tsx          # server: categories/players/referees → Friendly wizard
```

Reutilizar sin reinventar:

- `ChileLocationPicker`
- `MatchRefereeEventsPicker`
- `FriendlyMatchConvocationPicker` / `FriendlyMatchTeamAssigner`
- `friendly-match-roster-ui.ts`
- `scheduleInputToIso` / `APP_LOCALE`
- `submitJson`

---

## 11. Validaciones y errores

| Regla | Dónde |
|-------|-------|
| Campos requeridos liga | Submit |
| Local ≠ visitante | Submit (y feedback inline si ya existe en API) |
| Categoría activa amistoso | Al montar / submit |
| ≥2 convocados | Antes de dar por válida la sección equipos |
| ≥1 por lado + capitán + DT | Submit amistoso |
| Fecha/hora válidas Chile | `scheduleInputToIso` |
| Errores API | Banner/texto bajo el footer o en el paso activo |

El botón principal del footer está disabled mientras `loading`. Texto: *Creando…* / *Crear partido* / *Crear partido amistoso*.

Tras éxito: limpiar draft y `router.push('/admin/matches')`.

---

## 12. Decisiones de UX (no revertir sin preguntar)

1. Dos rutas separadas; no tabs en la misma página.
2. Un paso abierto a la vez en el acordeón.
3. Convocatoria amistosa vive **dentro** del wizard (no post-creación obligatoria).
4. Sin duración de tiempos en esta versión.
5. Sin campo “nombre del partido” en DB; título = lados A vs B.
6. Borrador solo `localStorage`, por navegador.
7. API `POST /api/matches` sin cambios de contrato.
8. Live y listado de tarjetas admin no se rediseñan en este trabajo (lista solo pierde los forms).

---

## 13. Edge cases

- Sin temporadas / equipos → wizard liga muestra empty state y deshabilita crear.
- Sin categorías amistosas activas → empty state (igual que hoy) con link a categorías.
- Borrador con `seasonId`/`teamId`/`playerId` borrados → omitir ids inválidos al restaurar.
- Cambiar categoría amistosa → reset convocatoria (igual spec 2026-08-04).
- Dos pestañas abiertas → last-write-wins en `localStorage` (aceptable).

---

## 14. Testing

- Unit: presets (Básico/Completo → sets esperados; editar → Personalizado).
- Unit: serialización/restauración de draft (versión, ignore inválido).
- Smoke manual:
  - Crear liga completa y ver tarjeta en lista.
  - Crear amistoso con convocatoria y ver jugadores/pagos.
  - Recargar mitad del form → restaura borrador.
  - Crear exitoso → draft desaparece.
  - Móvil: acordeón usable, CTA visible.

---

## 15. Plan de implementación (alto nivel)

1. Shell + `WizardStep` + summary (UI sin submit).
2. Wizard liga cableado a `POST /api/matches`.
3. Presets + integración en ambos wizards.
4. Wizard amistoso (pasos 1–3, 5–6) + paso 4 convocatoria/equipos.
5. Draft hook + indicadores header/footer.
6. Actualizar `/admin/matches` (botones; quitar forms).
7. Tests + verificación visual vs mockups.
8. Deploy a prod (push + deploy Vercel desde worktree si el git hook no dispara).

---

## 16. Criterios de aceptación

- [ ] `/admin/matches` no muestra formularios de creación; sí botones a las dos rutas.
- [ ] Wizard liga crea partido liga con los mismos datos que el form anterior.
- [ ] Wizard amistoso crea amistoso con roster válido (capitán/DT).
- [ ] Resumen lateral refleja cambios al editar campos.
- [ ] Borrador sobrevive refresh y se limpia al crear.
- [ ] Preset Básico/Completo cambia eventos; editar a mano → Personalizado.
- [ ] Live sin cambios visuales.
- [ ] UI en español chileno.
