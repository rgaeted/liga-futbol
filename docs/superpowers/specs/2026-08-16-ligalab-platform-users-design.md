# LigaLab — usuarios de plataforma y rename — Design Spec

> Estado: **Diseño aprobado**
> Fecha: 2026-08-16
> Producto: **LigaLab** (antes AdminTorneo)

---

## 1. Objetivo

El admin de plataforma (`isPlatformAdmin`) puede dar de alta administradores de empresa, asignarles una o más ligas, ver quién administra qué y quitar ese acceso — sin entrar al panel de cada liga.

En la misma entrega, el nombre visible del producto pasa de AdminTorneo a **LigaLab**, incluida la cookie de organización activa (implica re-login).

## 2. Decisiones aprobadas

- Rol otorgado desde plataforma: solo `ORG_ADMIN`.
- Email existente: se reutiliza la cuenta; no se cambia nombre ni contraseña; se suma (o se promueve) membresía admin.
- Cuenta nueva: el platform admin define email, nombre y contraseña (se la pasa a la persona por fuera). No hay mail transaccional.
- UI: página `/plataforma/usuarios` con formulario + listado + quitar empresa.
- Una persona puede administrar varias empresas.
- Un solo rol por par (user, empresa): si ya era `PLAYER`/`COACH`/`REFEREE`/`FRIENDLY_COACH` en esa empresa, se **promueve** a `ORG_ADMIN`.
- Rename: textos de UI + cookie `admintorneo.org` → `ligalab.org`. No se toca el bundle id nativo `cl.admintorneo.{org}.{season}`.

## 3. Alcance

### Incluido

- Nav Plataforma → Usuarios.
- `GET/POST /api/plataforma/users`.
- `DELETE /api/plataforma/users/[userId]/memberships/[organizationId]`.
- Dominio: crear usuario, adjuntar membresías, promover rol, listar admins de empresa, revocar una membresía.
- Copy LigaLab en landing, login, metadata, shells admin/plataforma, ayuda, `manifest.json`.
- Constante `ORG_COOKIE` → `ligalab.org`.
- Tests de permisos, reutilización de email, promoción, revocación y cookie.

### Excluido

- Invitar por correo, reset de clave, impersonación.
- Crear desde plataforma roles distintos de `ORG_ADMIN`.
- Marcar o quitar `isPlatformAdmin` desde la UI (sigue el script `grant-platform-admin.ts`).
- Borrar la cuenta `User`.
- Cambiar bundle ids, slugs de edición móvil, host `torneos-kelme.vercel.app`.
- Cambiar el alta de Usuarios **dentro** de una liga (`POST /api/users`).

## 4. Arquitectura

| Unidad | Qué hace | Cómo se usa | Depende de |
|--------|----------|-------------|------------|
| `grantOrgAdminAccess` | Crea User si hace falta y asegura membresía `ORG_ADMIN` | `POST /api/plataforma/users` | Prisma User + OrganizationMembership |
| `listOrgAdmins` | Usuarios con ≥1 `ORG_ADMIN` y sus empresas | `GET /api/plataforma/users` | Memberships |
| `revokeOrgAdminMembership` | Borra una membresía | `DELETE .../memberships/[organizationId]` | Memberships |
| `/plataforma/usuarios` | Formulario y tabla | Platform admin | APIs de arriba |
| `ORG_COOKIE` | Cookie httpOnly de org activa | Login, APIs, switcher | `src/lib/org-cookie.ts` |

No hay migración Prisma: el modelo actual ya cubre User + OrganizationMembership.

## 5. Contratos API

Todas requieren `requirePlatformAdmin()`. Sin sesión o sin flag → 401.

### `GET /api/plataforma/users`

Respuesta: array de

```ts
{
  id: string
  email: string
  name: string
  organizations: Array<{ id: string; slug: string; name: string; status: 'ACTIVE' | 'PAUSED' }>
}
```

Orden: nombre ascendente. Solo usuarios con al menos una membresía `ORG_ADMIN`.

### `POST /api/plataforma/users`

Body:

```ts
{
  email: string        // email válido
  name: string         // min 2; se usa solo al crear
  password?: string    // min 6; obligatorio si el email no existe; se ignora si existe
  organizationIds: string[]  // min 1, ids de orgs ACTIVE
}
```

Comportamiento:

1. Validar body (Zod). `organizationIds` vacío o org inexistente/pausada → 400.
2. Buscar user por email (mismo criterio que el login actual).
3. Si no existe y falta `password` o tiene menos de 6 caracteres → 400.
4. Si no existe: crear User con `passwordHash`; `isPlatformAdmin` queda false.
5. Si existe: no actualizar `name` ni `passwordHash`.
6. Por cada org:
   - sin membresía → `create` `ORG_ADMIN`
   - membresía con otro rol → `update` a `ORG_ADMIN`
   - ya `ORG_ADMIN` → no-op
7. 201 si se creó el User; 200 si solo se adjuntaron/promovieron membresías.
8. Cuerpo: el mismo shape que un ítem de GET.

### `DELETE /api/plataforma/users/[userId]/memberships/[organizationId]`

- Membresía inexistente → 404.
- Si el rol no es `ORG_ADMIN` → 409 (esta API no quita DT/jugador; eso sigue en Usuarios de la liga).
- Si es `ORG_ADMIN` → borra la fila. 204.
- Se puede revocar incluso al usuario logueado: el acceso a `/plataforma` depende de `isPlatformAdmin`, no de membresías.

## 6. UI

- Header plataforma: Empresas, **Usuarios**, Árbitros, Apps.
- Formulario: email, nombre, contraseña, checkboxes de empresas ACTIVE, submit “Dar acceso”.
- Tabla: nombre, email, chips de empresa con control para quitar.
- Errores de API en texto bajo el formulario (español chileno, tú).
- Copy de la página: “Administradores de empresa”, no “usuarios de LigaLab” genérico, para no confundir con jugadores.

## 7. Rename LigaLab

Reemplazar “AdminTorneo” en textos de producto (landing, login, `generateMetadata` root, `AdminShell`, layout plataforma, `ProductLanding`, `MarketingShell` default, `manifest.json`, frases de ayuda que nombren el producto).

No reemplazar:

- `cl.admintorneo.` en bundle id preview.
- Comentarios internos o nombres de variables salvo la constante de cookie.
- Dominio de prod `torneos-kelme.vercel.app`.

Cookie: `ORG_COOKIE = 'ligalab.org'`. Quien tenga `admintorneo.org` queda sin org activa hasta el próximo post-login / selector; debe volver a iniciar sesión. No hay dual-read del nombre viejo.

## 8. Errores y bordes

| Caso | Resultado |
|------|-----------|
| No platform admin | 401 |
| Email inválido / nombre corto / clave &lt; 6 en alta nueva | 400 |
| Alta nueva sin password | 400 |
| Password en usuario existente | se ignora |
| Org pausada o id desconocido | 400, no se aplica ninguna membresía (transacción) |
| Email ya admin de esas orgs | 200, no-op |
| Quitar membresía que no es ORG_ADMIN | 409 |
| Usuario sin membresías tras el delete | cuenta queda; post-login → `/plataforma` si es platform admin, si no `/login?error=sin-acceso` |

## 9. Tests

- POST crea user + N membresías.
- POST con email existente no pisa password; agrega org.
- POST promueve `PLAYER` → `ORG_ADMIN` en esa org.
- POST rechaza org pausada (nada persistido).
- GET no lista usuarios sin `ORG_ADMIN`.
- DELETE quita una org y deja las demás.
- DELETE 409 si el rol no es admin de empresa.
- GET/POST/DELETE 401 sin platform admin.
- `ORG_COOKIE` es `ligalab.org`.
- Un smoke de copy: landing o layout root contiene `LigaLab` y no el título de producto `AdminTorneo`.
