# Pool de árbitros — Design Spec

> Estado: **Diseño aprobado**
> Plan: [`docs/superpowers/plans/2026-08-14-pool-arbitros.md`](../plans/2026-08-14-pool-arbitros.md)
> Fecha: 2026-08-14
> Producto: **AdminTorneo**
> Depende de: organizaciones. **No** depende de jugador único.
> Independiente de: amistosos entre orgs y app móvil.

---

## 1. Objetivo

Los árbitros dejan de ser “un usuario con rol REFEREE escondido en Usuarios”. Pasan a un **directorio contactable** por empresa, con ficha (teléfono / WhatsApp) y la posibilidad de **compartir el mismo árbitro con otra organización** sin duplicar la cuenta.

Hoy `Match.refereeId` apunta a `User`. El listado para asignar partido es `OrganizationMembership` con rol `REFEREE` en esa org. No hay teléfono. Para pitar en dos ligas hay que crear membership a mano desde Usuarios, sin ficha común.

El live, el panel del árbitro y el reloj **no cambian**. Solo directorio, contacto y cómo se otorga el acceso a otra empresa.

## 2. Decisiones recomendadas

| Tema | Elección | Por qué |
|------|----------|---------|
| Identidad | Sigue siendo `User` + membership `REFEREE` | Ya autoriza `/referee` y `Match.refereeId`; no inventar `Referee` paralelo a User |
| Ficha de contacto | `RefereeProfile` 1:1 con `User` | User hoy solo tiene email/nombre; el teléfono no debe ir en todos los usuarios |
| Alcance del pool | Por empresa (directorio local) + **invitar a otra org** | Un pool global público mezclaría ligas que no se conocen |
| Quién comparte | ORG_ADMIN de la org origen invita a otra org por slug; el ORG_ADMIN destino **acepta** | Evita que Kelme meta un árbitro en una liga que no lo pidió |
| Platform admin | Puede ver el directorio global y crear membership `REFEREE` directa (sin invitación) | Eres el dueño de la plataforma; útil para onboarding |
| Disponibilidad / calendario | Fuera de v1 | El dolor actual es “cómo lo contacto y cómo lo asigno”, no un booking |
| Cobro al árbitro | Fuera de v1 | No hay billing en AdminTorneo |

### Alternativas descartadas

1. **Directorio global visible a todas las empresas.** Filtra teléfonos entre clientes que no se eligieron.
2. **Tabla `Referee` desligada de `User`.** Duplica login y rompe `Match.refereeId`.

## 3. Alcance

### Incluido

- `RefereeProfile`: teléfono, WhatsApp (mismo o distinto), notas internas, foto opcional (Storage, mismo bucket `editorial`, path `referees/{userId}/photo`).
- Página admin `/{slug}/admin/referees`: listado con nombre, email, teléfono, WhatsApp (link `wa.me`), partidos próximos asignados.
- Alta: crear usuario + membership `REFEREE` + ficha (reutiliza el alta de usuarios actual, con campos extra).
- Editar ficha (contacto y notas). No se cambia el email desde esta pantalla si ya existe la cuenta (eso sigue en Usuarios).
- Asignar árbitro a partido: el selector actual lee el mismo listado; no cambia `Match.refereeId`.
- Invitación entre orgs: origen propone, destino acepta o rechaza; al aceptar se crea membership `REFEREE` en destino **sin segundo User**.
- Panel `/plataforma/arbitros`: lista users con al menos un `RefereeProfile` o membership REFEREE, orgs donde pitan, acción “dar acceso a org”.
- Tests de aislamiento (no ver teléfono de otra org), invitación y asignación.

### Excluido

- Calendario de disponibilidad, tarifas, evaluaciones del árbitro.
- Pool “marketplace” público.
- App móvil del árbitro.
- Permitir pitar un partido de org A a un user sin membership en A (la invitación/aceptación es el gate).
- Impersonar al árbitro.

## 4. Arquitectura

```text
User
  ├─ RefereeProfile?     ← teléfono, whatsapp, notas, foto
  ├─ memberships[]       ← REFEREE en cada org donde puede pitar
  └─ refereeMatches[]    ← Match.refereeId (sin cambio)

ORG_ADMIN origen  →  RefereeShareInvite  →  ORG_ADMIN destino
                                              └─ acepta → OrganizationMembership(REFEREE)
```

| Unidad | Qué hace | Cómo se usa | Depende de |
|--------|----------|-------------|------------|
| `RefereeProfile` | Contacto | Directorio y wa.me | User |
| `RefereeShareInvite` | Invitación pendiente entre orgs | Flujo compartir | User, 2× Organization |
| `src/lib/referees.ts` | CRUD ficha, listar por org, compartir | APIs admin/plataforma | Prisma, org-scope |

## 5. Modelo de datos

```prisma
model RefereeProfile {
  userId           String   @id
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  phone            String?
  whatsapp         String?
  notes            String?
  photoStoragePath String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

enum RefereeShareInviteStatus {
  PENDING
  ACCEPTED
  DECLINED
  CANCELLED
}

model RefereeShareInvite {
  id                 String                     @id @default(cuid())
  refereeUserId      String
  refereeUser        User                       @relation(fields: [refereeUserId], references: [id], onDelete: Cascade)
  fromOrganizationId String
  fromOrganization   Organization               @relation("RefereeShareFrom", fields: [fromOrganizationId], references: [id], onDelete: Cascade)
  toOrganizationId   String
  toOrganization     Organization               @relation("RefereeShareTo", fields: [toOrganizationId], references: [id], onDelete: Cascade)
  invitedByUserId    String
  status             RefereeShareInviteStatus   @default(PENDING)
  createdAt          DateTime                   @default(now())
  updatedAt          DateTime                   @updatedAt

  @@unique([refereeUserId, toOrganizationId, status])
}
```

**Elección explícita:** en la migración SQL, unique parcial `UNIQUE (refereeUserId, toOrganizationId) WHERE status = 'PENDING'`. Prisma declara `@@index([toOrganizationId, status])`. Reinvitar después de DECLINED/CANCELLED está permitido. Si ya es REFEREE en destino, la API responde 409 y no crea invite.

Backfill: por cada membership `REFEREE`, `INSERT RefereeProfile (userId)` si no existe, con phone/whatsapp/notes null. No se inventan teléfonos.

Teléfono y WhatsApp: strings libres validados en Zod (dígitos, `+`, espacios; 8–15 dígitos). Se normaliza a solo dígitos con código país para `wa.me`. Si no hay código, asumir Chile `56`.

## 6. Permisos

### ORG_ADMIN (su org)

- CRUD directorio de árbitros **con membership en su org**.
- Ver teléfono/WhatsApp/notas de esos árbitros.
- Crear árbitro (user nuevo o email existente): si el email ya es user, se crea membership `REFEREE` y perfil si falta. Si ya era `ORG_ADMIN`/`COACH`/`PLAYER` en esa org → 409 (v1 sigue siendo **un rol por empresa**).
- Invitar a otra org: el árbitro debe tener membership REFEREE en la org origen. Destino ≠ origen. Crea `PENDING`.
- Aceptar/rechazar invitaciones **hacia su org**.
- Cancelar invitaciones PENDING que salieron de su org.

### Árbitro

- Sigue usando `/[slug]/referee`. No edita su teléfono en v1 (lo carga el admin). Evita un flujo extra de “mi perfil”.

### Platform admin

- Lista global, alta de acceso `REFEREE` a una org sin invitación.
- No ve partidos ni entra al panel de la liga salvo membership propia (regla ya vigente).

## 7. Rutas

| Ruta | Quién |
|------|--------|
| `/{slug}/admin/referees` | Directorio |
| `/{slug}/admin/referees/invites` | Invitaciones recibidas / enviadas |
| `/plataforma/arbitros` | Directorio global |
| `GET/POST /api/admin/referees` | Listar / crear en org activa |
| `PATCH /api/admin/referees/[userId]` | Ficha |
| `POST /api/admin/referees/[userId]/share` | Invitar `{ toOrganizationSlug }` |
| `POST /api/admin/referee-invites/[id]/accept` | Aceptar |
| `POST /api/admin/referee-invites/[id]/decline` | Rechazar |
| `POST /api/plataforma/referees/[userId]/access` | Grant directo `{ organizationId }` |

El selector de árbitro al crear partido **no cambia de API**: sigue listando memberships REFEREE de la org. Tras aceptar share, el árbitro aparece solo.

## 8. UX

- Directorio tipo agenda: nombre grande, teléfono, botón WhatsApp, email, “Próximo partido”.
- Compartir: modal “Invitar a otra organización” con slug/nombre de empresas **activas** (lista corta desde API `GET /api/admin/organizations-directory` — solo `id, slug, name, logo` de orgs ACTIVE, sin datos internos).
- Invitaciones pendientes: banner en el directorio destino “Kelme te comparte a Juan Pérez”.

Copy es-CL: “Invitar a otra liga”, “Aceptar árbitro”, “Este correo ya tiene otro rol en tu organización”.

## 9. Errores

- Compartir a org pausada o inexistente → 404/400.
- Ya es REFEREE en destino → 409, no crear invite.
- Ya hay PENDING al mismo destino → 409.
- Árbitro sin membership en origen → 403.
- Teléfono inválido → 400.

## 10. Pruebas

- ORG_ADMIN Kelme no lee `RefereeProfile` de un árbitro que solo pita en otra org.
- Aceptar invite crea membership y el user aparece en el selector de partidos destino.
- Rechazar no crea membership.
- Grant de plataforma crea membership sin invite.
- Usuario que ya es COACH en destino no puede aceptar como segundo rol (409).
- `wa.me` con número chileno sin `+` arma `56…`.
- Asignar `Match.refereeId` y panel live/árbitro sin cambios de contrato.

## 11. Fuera de discusión en implementación

No se cambia reloj, eventos, realtime ni `Match.refereeId`. No se toca la app móvil.
