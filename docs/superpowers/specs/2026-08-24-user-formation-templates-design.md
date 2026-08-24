# Formación — plantillas personalizadas por usuario — Design Spec

> Fecha: 2026-08-24  
> Producto: **LigaLab**  
> Depende de: `FormationEditor`, `slotLayout`, `formations.ts`, `MatchFormation`, citación liga / roster amistoso  
> Estado: **Diseño aprobado** (por usuario; solo posiciones; gestión renombrar/eliminar)

---

## 1. Objetivo

Permitir que un DT (o cualquier usuario que edite formación) **guarde** una disposición en cancha ajustada manualmente como **formación personalizada con nombre**, reutilizable en futuros partidos. La plantilla aparece en el selector de esquema junto a las clásicas (`4-4-2`, `4-3-3`, etc.).

Hoy `slotLayout` solo persiste **por partido** en `MatchFormation`. No hay plantillas reutilizables (explícitamente fuera de alcance en v1 de posiciones libres).

---

## 2. Decisiones

| Tema | Elección | Por qué |
|------|----------|---------|
| Propiedad | **Por usuario** (`userId`) | El DT pidió opción B; no compartidas con el equipo |
| Qué guarda | **Esquema base + `slotLayout`** | Posiciones en cancha; sin jugadores asignados |
| Persistencia | Tabla `UserFormationTemplate` | CRUD limpio, sync entre dispositivos, patrón `/api/me/*` |
| Selector | Optgroups **Clásicas** / **Mis formaciones** | Misma UX que esquemas actuales; nombre visible + base entre paréntesis |
| Valor interno custom | `custom:{templateId}` en el `<select>` | `MatchFormation.scheme` sigue siendo el esquema clásico (`4-4-2`) |
| Gestión v1 | Renombrar y eliminar en el editor | Sin pantalla aparte |
| Formato | Scoped por `footballFormat` | F11 / F7 / F6 / F5 tienen catálogos distintos |
| Acierto táctico | Sin cambio | Sigue por `slotKey` del esquema base |

### Alternativas descartadas

1. **`localStorage`**. No sincroniza entre dispositivos.
2. **JSON en `User`**. CRUD y validación incómodos.
3. **Por equipo u org**. El usuario eligió propiedad individual.

---

## 3. Alcance

### Incluido

- Modelo `UserFormationTemplate` + migración Prisma.
- API `GET/POST /api/me/formation-templates` y `PATCH/DELETE /api/me/formation-templates/[id]`.
- Helpers: prefijo `custom:`, resolver selección → `baseScheme` + `slotLayout`.
- `FormationEditor`:
  - Optgroups en selector de esquema.
  - Botón **Guardar como formación personalizada** (cuando hay layout ajustado).
  - Sección **Mis formaciones** con renombrar / eliminar.
- Wire en `CallUpForm`, `LeagueLineupEditor`, `FriendlyLineupEditor` (fetch templates del usuario).
- Tests unitarios (helpers + validación Zod) y tests API básicos si el repo lo permite.

### Excluido (v1)

- Compartir plantillas entre usuarios, equipos u orgs.
- Guardar asignaciones de jugadores.
- Duplicar plantilla.
- Límite máximo de plantillas (revisar después si hace falta).
- Editar posiciones de una plantilla ya guardada (crear una nueva).

---

## 4. Modelo de datos

```prisma
model UserFormationTemplate {
  id             String         @id @default(cuid())
  userId         String
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  name           String
  baseScheme     String
  footballFormat FootballFormat
  slotLayout     Json
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@unique([userId, footballFormat, name])
  @@index([userId, footballFormat])
}
```

Relación inversa en `User`: `formationTemplates UserFormationTemplate[]`.

- `baseScheme`: esquema clásico válido para `footballFormat` (ej. `4-4-2`).
- `slotLayout`: mismo tipo que `MatchFormation.slotLayout` — overrides parciales o completos (sin `GK`).
- Unicidad de `name` por usuario y formato.

Al guardar formación de partido: API formations recibe `scheme = baseScheme` (nunca `custom:…`) y `slotLayout` aplicado.

---

## 5. API

### GET `/api/me/formation-templates?format=FUTBOL_11`

Auth requerida. Respuesta:

```ts
{
  templates: Array<{
    id: string
    name: string
    baseScheme: string
    footballFormat: FootballFormat
    slotLayout: SlotLayout
    createdAt: string
    updatedAt: string
  }>
}
```

Solo plantillas del usuario autenticado para el `format` indicado.

### POST `/api/me/formation-templates`

Body:

```ts
{
  name: string          // 2–40 chars, trim
  baseScheme: string
  footballFormat: FootballFormat
  slotLayout: SlotLayout
}
```

Validaciones:

- `isValidScheme(baseScheme, footballFormat)`.
- `validateSlotLayout(baseScheme, footballFormat, slotLayout)` — debe tener al menos una clave (layout no vacío).
- Nombre único por `(userId, footballFormat)`.
- 409 si nombre duplicado.

### PATCH `/api/me/formation-templates/[id]`

Body: `{ name: string }` — solo renombrar. Ownership: solo el dueño.

### DELETE `/api/me/formation-templates/[id]`

Ownership: solo el dueño. 204 sin body.

---

## 6. Helpers (`src/lib/user-formation-templates.ts`)

```ts
export const CUSTOM_SCHEME_PREFIX = 'custom:'

export type UserFormationTemplateDto = {
  id: string
  name: string
  baseScheme: string
  footballFormat: FootballFormat
  slotLayout: SlotLayout
}

export function customSchemeValue(templateId: string): string
export function parseCustomSchemeId(value: string): string | null
export function isCustomSchemeValue(value: string): boolean

export function resolveEditorSchemeSelection(
  selectValue: string,
  templates: UserFormationTemplateDto[]
): { scheme: string; slotLayout: SlotLayout; templateId: string | null }

export function formatTemplateOptionLabel(name: string, baseScheme: string): string
// → "Rombo medio (4-4-2)"
```

`resolveEditorSchemeSelection`:

- Valor clásico → `{ scheme, slotLayout: {}, templateId: null }`.
- Valor `custom:{id}` → `{ scheme: template.baseScheme, slotLayout: template.slotLayout, templateId: id }`.
- ID desconocido → fallback al default del formato.

---

## 7. UX — Editor

### Selector de esquema

```html
<select>
  <optgroup label="Clásicas">
    <option value="4-4-2">4-4-2</option>
    ...
  </optgroup>
  <optgroup label="Mis formaciones">
    <option value="custom:abc123">Rombo medio (4-4-2)</option>
  </optgroup>
</select>
```

Si no hay plantillas, omitir el optgroup **Mis formaciones**.

### Cambio de esquema

- Clásica → otra clásica: confirmación si hay layout ajustado; reset layout (comportamiento actual).
- Custom → otra opción: confirmación si el layout actual difiere del destino; aplicar layout de la plantilla elegida.
- Al elegir custom: aplicar `baseScheme` + `slotLayout`; **no** modificar asignaciones de jugadores (filtrar slots inválidos como hoy).

### Guardar plantilla

Botón **Guardar como formación personalizada**:

- Visible si `!readOnly` y `Object.keys(slotLayout).length > 0`.
- Prompt/modal pide nombre.
- POST a API; refrescar lista local; opcionalmente seleccionar la nueva plantilla en el dropdown.

### Gestión

Debajo del selector, si hay plantillas para el formato:

- Lista: nombre, esquema base, acciones **Renombrar** / **Eliminar**.
- Eliminar: `window.confirm`.
- Renombrar: `window.prompt` o input inline.

Copy en español chileno (`es-CL`).

---

## 8. Integración en editores padre

`CallUpForm`, `LeagueLineupEditor`, `FriendlyLineupEditor`:

1. Fetch `GET /api/me/formation-templates?format=…` al montar (client).
2. Pasar `templates` y `onTemplatesChange` a `FormationEditor`.
3. Sin cambio en `onSave` del partido — sigue enviando `scheme` clásico + `slotLayout`.

---

## 9. Pitfalls

- **Persistir `custom:…` en `MatchFormation.scheme`**: prohibido; siempre resolver a `baseScheme` al guardar partido.
- **Plantilla con layout vacío**: rechazar en POST (debe haber al menos un slot ajustado).
- **Cambio de formato en partido**: templates filtradas por `footballFormat`; no mezclar F11 con F7.
- **Template borrada mientras está seleccionada**: fallback a esquema default del formato.
- **Migración prod**: manual vía `supabase db query --linked` (Vercel no corre migrate en build).
- **CallUpForm remonta**: fetch templates una vez; estado de templates en `FormationEditor` o wrapper estable.

---

## 10. Spec coverage checklist

| Requisito | Sección |
|-----------|---------|
| Por usuario | §2, §4 |
| Solo posiciones | §2, §4 |
| Nombre personalizado | §6, §7 |
| Aparece junto a clásicas | §7 |
| Renombrar / eliminar | §3, §5, §7 |
| Sin jugadores | §2, §4 |
| Mismo editor en liga/amistoso/citación | §3, §8 |
| Fuera de alcance v1 | §3 |
