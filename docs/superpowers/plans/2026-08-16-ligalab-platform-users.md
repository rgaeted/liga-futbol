# LigaLab — usuarios de plataforma y rename — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El admin de plataforma puede dar, listar y revocar acceso `ORG_ADMIN` a una o más empresas desde `/plataforma/usuarios`, y el producto visible pasa de AdminTorneo a LigaLab (incluida la cookie de org activa).

**Architecture:** Dominio nuevo en `src/lib/platform-org-admins.ts` (crear/reutilizar User, promover membresía, listar, revocar). APIs dedicadas bajo `/api/plataforma/users` con `requirePlatformAdmin()`. UI de consola de plataforma. Rename de copy + `ORG_COOKIE`. Sin migración Prisma: el modelo User + OrganizationMembership ya cubre el caso.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Auth.js, Zod, Vitest, bcryptjs, Tailwind.

**Spec:** `docs/superpowers/specs/2026-08-16-ligalab-platform-users-design.md`

## Global Constraints

- UI y copy: español chileno (`es-CL`), tú, no voseo.
- Rol otorgado desde plataforma: **solo** `ORG_ADMIN`. No crear PLAYER/COACH/REFEREE desde esta UI.
- Email existente: reutilizar cuenta; **no** cambiar `name` ni `passwordHash`; sumar o promover membresía.
- Cuenta nueva: platform admin define email, nombre y contraseña. Sin mail transaccional.
- Una membresía por par (user, org). Si ya hay otro rol → `update` a `ORG_ADMIN`.
- Org pausada o id desconocido → 400 y **nada** persistido (transacción / validación previa).
- DELETE solo borra membresía `ORG_ADMIN`. 409 si el rol es otro. No borrar `User`.
- `isPlatformAdmin` no se toca desde esta UI (sigue `scripts/grant-platform-admin.ts`).
- **No** modificar `POST /api/users` (alta de usuarios **dentro** de una liga).
- **No** cambiar bundle id nativo `cl.admintorneo.{org}.{season}` ni `src/lib/mobile-edition-slug.ts`.
- **No** cambiar host `torneos-kelme.vercel.app`.
- Cookie: `ORG_COOKIE = 'ligalab.org'`. Sin dual-read del nombre viejo `admintorneo.org`.
- Commits: uno por tarea. No commitear `.env` ni `docs/handoff/`.
- Tests: TDD. Correr el archivo de test indicado **antes** de implementar (debe fallar) y **después** (debe pasar).

## File Map

| File | Responsibility |
|------|----------------|
| `src/lib/platform-org-admins.ts` | `grantOrgAdminAccess`, `listOrgAdmins`, `revokeOrgAdminMembership`, `PlatformOrgAdminError` |
| `src/lib/validations/platform-org-admin.ts` | Zod del POST |
| `src/app/api/plataforma/users/route.ts` | GET lista, POST alta/grant |
| `src/app/api/plataforma/users/[userId]/memberships/[organizationId]/route.ts` | DELETE una membresía |
| `src/app/plataforma/usuarios/page.tsx` | Página server: form + tabla |
| `src/components/plataforma/PlatformOrgAdminForm.tsx` | Formulario cliente |
| `src/components/plataforma/PlatformOrgAdminTable.tsx` | Tabla + quitar |
| `src/app/plataforma/layout.tsx` | Nav Usuarios + rename LigaLab |
| `src/lib/org-cookie.ts` | `ORG_COOKIE = 'ligalab.org'` |
| `src/app/layout.tsx`, login, landing, shells, `public/manifest.json` | Copy LigaLab |

No tocar: `src/app/api/users/route.ts`, `src/lib/mobile-edition-slug.ts`, Prisma schema.

---

### Task 1: Dominio — grantOrgAdminAccess

**Files:**
- Create: `src/lib/platform-org-admins.ts`
- Test: `tests/lib/platform-org-admins.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/platform-org-admins.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MembershipRole } from '@/lib/membership-role'

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async () => 'hashed') },
}))

vi.mock('@/lib/db', () => ({
  db: {
    organization: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { db } from '@/lib/db'
import {
  PlatformOrgAdminError,
  grantOrgAdminAccess,
} from '@/lib/platform-org-admins'

const kelme = {
  id: 'org-kelme',
  slug: 'kelme',
  name: 'Torneos Kelme',
  status: 'ACTIVE' as const,
}

const demo = {
  id: 'org-demo',
  slug: 'liga-demo',
  name: 'Liga Demo',
  status: 'ACTIVE' as const,
}

function adminUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'ana@liga.com',
    name: 'Ana Pérez',
    memberships: [{ organization: kelme }],
    ...overrides,
  }
}

describe('grantOrgAdminAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a user and N ORG_ADMIN memberships', async () => {
    vi.mocked(db.organization.findMany).mockResolvedValue([kelme, demo] as never)
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        adminUserRow({
          memberships: [{ organization: kelme }, { organization: demo }],
        }) as never,
      )

    const membershipCreate = vi.fn()
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        user: {
          create: vi.fn().mockResolvedValue({ id: 'user-1' }),
        },
        organizationMembership: { create: membershipCreate, findUnique: vi.fn(), update: vi.fn() },
      } as never),
    )

    const result = await grantOrgAdminAccess({
      email: 'ana@liga.com',
      name: 'Ana Pérez',
      password: 'secret1',
      organizationIds: ['org-kelme', 'org-demo'],
    })

    expect(result.created).toBe(true)
    expect(result.user.email).toBe('ana@liga.com')
    expect(result.user.organizations.map((o) => o.slug)).toEqual(['kelme', 'liga-demo'])
    expect(membershipCreate).toHaveBeenCalledTimes(2)
    expect(membershipCreate).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-kelme',
        userId: 'user-1',
        role: MembershipRole.ORG_ADMIN,
      },
    })
  })

  it('reuses an existing email without changing name or password', async () => {
    vi.mocked(db.organization.findMany).mockResolvedValue([demo] as never)
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({ id: 'user-1', email: 'ana@liga.com', name: 'Ana Pérez' } as never)
      .mockResolvedValueOnce(
        adminUserRow({
          memberships: [{ organization: kelme }, { organization: demo }],
        }) as never,
      )

    const userCreate = vi.fn()
    const userUpdate = vi.fn()
    const membershipCreate = vi.fn()
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        user: { create: userCreate, update: userUpdate },
        organizationMembership: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: membershipCreate,
          update: vi.fn(),
        },
      } as never),
    )

    const result = await grantOrgAdminAccess({
      email: 'ana@liga.com',
      name: 'Otro Nombre',
      password: 'nuevaclave',
      organizationIds: ['org-demo'],
    })

    expect(result.created).toBe(false)
    expect(userCreate).not.toHaveBeenCalled()
    expect(userUpdate).not.toHaveBeenCalled()
    expect(membershipCreate).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-demo',
        userId: 'user-1',
        role: MembershipRole.ORG_ADMIN,
      },
    })
  })

  it('promotes PLAYER to ORG_ADMIN in that org', async () => {
    vi.mocked(db.organization.findMany).mockResolvedValue([kelme] as never)
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({ id: 'user-1', email: 'ana@liga.com', name: 'Ana Pérez' } as never)
      .mockResolvedValueOnce(adminUserRow() as never)

    const membershipUpdate = vi.fn()
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        user: { create: vi.fn(), update: vi.fn() },
        organizationMembership: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'mem-1',
            role: MembershipRole.PLAYER,
          }),
          create: vi.fn(),
          update: membershipUpdate,
        },
      } as never),
    )

    await grantOrgAdminAccess({
      email: 'ana@liga.com',
      name: 'Ana Pérez',
      organizationIds: ['org-kelme'],
    })

    expect(membershipUpdate).toHaveBeenCalledWith({
      where: { id: 'mem-1' },
      data: { role: MembershipRole.ORG_ADMIN },
    })
  })

  it('is a no-op when already ORG_ADMIN', async () => {
    vi.mocked(db.organization.findMany).mockResolvedValue([kelme] as never)
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({ id: 'user-1', email: 'ana@liga.com', name: 'Ana Pérez' } as never)
      .mockResolvedValueOnce(adminUserRow() as never)

    const membershipCreate = vi.fn()
    const membershipUpdate = vi.fn()
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        user: { create: vi.fn(), update: vi.fn() },
        organizationMembership: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'mem-1',
            role: MembershipRole.ORG_ADMIN,
          }),
          create: membershipCreate,
          update: membershipUpdate,
        },
      } as never),
    )

    const result = await grantOrgAdminAccess({
      email: 'ana@liga.com',
      name: 'Ana Pérez',
      organizationIds: ['org-kelme'],
    })

    expect(result.created).toBe(false)
    expect(membershipCreate).not.toHaveBeenCalled()
    expect(membershipUpdate).not.toHaveBeenCalled()
  })

  it('rejects paused or unknown orgs without starting a transaction', async () => {
    vi.mocked(db.organization.findMany).mockResolvedValue([
      { ...kelme, status: 'PAUSED' },
    ] as never)

    await expect(
      grantOrgAdminAccess({
        email: 'ana@liga.com',
        name: 'Ana Pérez',
        password: 'secret1',
        organizationIds: ['org-kelme'],
      }),
    ).rejects.toMatchObject({ code: 'invalid_orgs' })

    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('requires password when creating a new user', async () => {
    vi.mocked(db.organization.findMany).mockResolvedValue([kelme] as never)
    vi.mocked(db.user.findUnique).mockResolvedValue(null)

    await expect(
      grantOrgAdminAccess({
        email: 'ana@liga.com',
        name: 'Ana Pérez',
        organizationIds: ['org-kelme'],
      }),
    ).rejects.toBeInstanceOf(PlatformOrgAdminError)

    await expect(
      grantOrgAdminAccess({
        email: 'ana@liga.com',
        name: 'Ana Pérez',
        organizationIds: ['org-kelme'],
      }),
    ).rejects.toMatchObject({ code: 'password_required' })

    expect(db.$transaction).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/platform-org-admins.test.ts`

Expected: FAIL because `@/lib/platform-org-admins` does not exist.

- [ ] **Step 3: Implement grantOrgAdminAccess**

Create `src/lib/platform-org-admins.ts`:

```ts
import bcrypt from 'bcryptjs'
import { MembershipRole } from '@/lib/membership-role'
import { db } from '@/lib/db'

export type PlatformOrgAdminErrorCode =
  | 'invalid_orgs'
  | 'password_required'
  | 'not_found'
  | 'not_org_admin'

export class PlatformOrgAdminError extends Error {
  code: PlatformOrgAdminErrorCode

  constructor(code: PlatformOrgAdminErrorCode) {
    super(code)
    this.code = code
  }
}

export type OrgAdminOrganization = {
  id: string
  slug: string
  name: string
  status: 'ACTIVE' | 'PAUSED'
}

export type OrgAdminUser = {
  id: string
  email: string
  name: string
  organizations: OrgAdminOrganization[]
}

const orgAdminSelect = {
  id: true,
  email: true,
  name: true,
  memberships: {
    where: { role: MembershipRole.ORG_ADMIN },
    select: {
      organization: {
        select: { id: true, slug: true, name: true, status: true },
      },
    },
  },
} as const

function toOrgAdminUser(user: {
  id: string
  email: string
  name: string
  memberships: Array<{ organization: OrgAdminOrganization }>
}): OrgAdminUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    organizations: user.memberships.map((m) => m.organization),
  }
}

async function loadActiveOrganizations(organizationIds: string[]) {
  const orgs = await db.organization.findMany({
    where: { id: { in: organizationIds } },
    select: { id: true, slug: true, name: true, status: true },
  })
  if (
    orgs.length !== organizationIds.length ||
    orgs.some((org) => org.status !== 'ACTIVE')
  ) {
    throw new PlatformOrgAdminError('invalid_orgs')
  }
  return orgs
}

async function loadOrgAdminUser(email: string): Promise<OrgAdminUser> {
  const user = await db.user.findUnique({
    where: { email },
    select: orgAdminSelect,
  })
  if (!user) {
    throw new PlatformOrgAdminError('not_found')
  }
  return toOrgAdminUser(user)
}

export async function grantOrgAdminAccess(input: {
  email: string
  name: string
  password?: string
  organizationIds: string[]
}): Promise<{ created: boolean; user: OrgAdminUser }> {
  await loadActiveOrganizations(input.organizationIds)

  const existing = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  })

  if (!existing && (!input.password || input.password.length < 6)) {
    throw new PlatformOrgAdminError('password_required')
  }

  await db.$transaction(async (tx) => {
    let userId = existing?.id
    if (!userId) {
      const passwordHash = await bcrypt.hash(input.password as string, 10)
      const created = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
        },
      })
      userId = created.id
    }

    for (const organizationId of input.organizationIds) {
      const membership = await tx.organizationMembership.findUnique({
        where: {
          organizationId_userId: { organizationId, userId },
        },
      })
      if (!membership) {
        await tx.organizationMembership.create({
          data: {
            organizationId,
            userId,
            role: MembershipRole.ORG_ADMIN,
          },
        })
        continue
      }
      if (membership.role !== MembershipRole.ORG_ADMIN) {
        await tx.organizationMembership.update({
          where: { id: membership.id },
          data: { role: MembershipRole.ORG_ADMIN },
        })
      }
    }
  })

  return {
    created: !existing,
    user: await loadOrgAdminUser(input.email),
  }
}
```

Leave `listOrgAdmins` / `revokeOrgAdminMembership` out of this file until Task 2. If TypeScript complains about unused `toOrgAdminUser` helpers used only by grant, keep them — Task 2 reuses them.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/platform-org-admins.test.ts`

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/platform-org-admins.ts tests/lib/platform-org-admins.test.ts
git commit -m "$(cat <<'EOF'
feat: grant platform ORG_ADMIN access across companies

EOF
)"
```

---

### Task 2: Dominio — listOrgAdmins y revokeOrgAdminMembership

**Files:**
- Modify: `src/lib/platform-org-admins.ts`
- Test: `tests/lib/platform-org-admins.test.ts`

- [ ] **Step 1: Append failing tests** to `tests/lib/platform-org-admins.test.ts`

Add imports of `listOrgAdmins` and `revokeOrgAdminMembership`. Extend the db mock:

```ts
vi.mock('@/lib/db', () => ({
  db: {
    organization: { findMany: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    organizationMembership: { findUnique: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
  },
}))
```

Append:

```ts
describe('listOrgAdmins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns only users with at least one ORG_ADMIN membership', async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      adminUserRow({
        memberships: [{ organization: kelme }, { organization: demo }],
      }),
    ] as never)

    const users = await listOrgAdmins()
    expect(users).toHaveLength(1)
    expect(users[0].organizations).toHaveLength(2)
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { memberships: { some: { role: MembershipRole.ORG_ADMIN } } },
        orderBy: { name: 'asc' },
      }),
    )
  })
})

describe('revokeOrgAdminMembership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes an ORG_ADMIN membership', async () => {
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      id: 'mem-1',
      role: MembershipRole.ORG_ADMIN,
    } as never)
    vi.mocked(db.organizationMembership.delete).mockResolvedValue({} as never)

    await revokeOrgAdminMembership('user-1', 'org-kelme')

    expect(db.organizationMembership.delete).toHaveBeenCalledWith({
      where: { id: 'mem-1' },
    })
  })

  it('returns not_found when membership is missing', async () => {
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue(null)

    await expect(revokeOrgAdminMembership('user-1', 'org-kelme')).rejects.toMatchObject({
      code: 'not_found',
    })
    expect(db.organizationMembership.delete).not.toHaveBeenCalled()
  })

  it('returns not_org_admin when the role is not ORG_ADMIN', async () => {
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      id: 'mem-1',
      role: MembershipRole.PLAYER,
    } as never)

    await expect(revokeOrgAdminMembership('user-1', 'org-kelme')).rejects.toMatchObject({
      code: 'not_org_admin',
    })
    expect(db.organizationMembership.delete).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify new cases fail**

Run: `npx vitest run tests/lib/platform-org-admins.test.ts`

Expected: FAIL — `listOrgAdmins` / `revokeOrgAdminMembership` are not exported.

- [ ] **Step 3: Implement list + revoke** in the same file `src/lib/platform-org-admins.ts`

Append:

```ts
export async function listOrgAdmins(): Promise<OrgAdminUser[]> {
  const users = await db.user.findMany({
    where: { memberships: { some: { role: MembershipRole.ORG_ADMIN } } },
    orderBy: { name: 'asc' },
    select: orgAdminSelect,
  })
  return users.map(toOrgAdminUser)
}

export async function revokeOrgAdminMembership(
  userId: string,
  organizationId: string,
): Promise<void> {
  const membership = await db.organizationMembership.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
  })
  if (!membership) {
    throw new PlatformOrgAdminError('not_found')
  }
  if (membership.role !== MembershipRole.ORG_ADMIN) {
    throw new PlatformOrgAdminError('not_org_admin')
  }
  await db.organizationMembership.delete({ where: { id: membership.id } })
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/platform-org-admins.test.ts`

Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/platform-org-admins.ts tests/lib/platform-org-admins.test.ts
git commit -m "$(cat <<'EOF'
feat: list and revoke platform org-admin memberships

EOF
)"
```

---

### Task 3: Zod del POST

**Files:**
- Create: `src/lib/validations/platform-org-admin.ts`
- Test: `tests/lib/validations/platform-org-admin.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/validations/platform-org-admin.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { grantOrgAdminAccessSchema } from '@/lib/validations/platform-org-admin'

describe('grantOrgAdminAccessSchema', () => {
  const valid = {
    email: 'ana@liga.com',
    name: 'Ana Pérez',
    password: 'secret1',
    organizationIds: ['org-1'],
  }

  it('accepts a new-user payload', () => {
    expect(grantOrgAdminAccessSchema.parse(valid)).toEqual(valid)
  })

  it('accepts existing-user payload without password', () => {
    const { password: _, ...rest } = valid
    expect(grantOrgAdminAccessSchema.parse(rest).password).toBeUndefined()
  })

  it('rejects invalid email, short name, short password, empty orgs', () => {
    expect(grantOrgAdminAccessSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false)
    expect(grantOrgAdminAccessSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false)
    expect(grantOrgAdminAccessSchema.safeParse({ ...valid, password: '12345' }).success).toBe(false)
    expect(grantOrgAdminAccessSchema.safeParse({ ...valid, organizationIds: [] }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/validations/platform-org-admin.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement**

Create `src/lib/validations/platform-org-admin.ts`:

```ts
import { z } from 'zod'

export const grantOrgAdminAccessSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6).optional(),
  organizationIds: z.array(z.string().min(1)).min(1),
})

export type GrantOrgAdminAccessInput = z.infer<typeof grantOrgAdminAccessSchema>
```

- [ ] **Step 4: Run test**

Run: `npx vitest run tests/lib/validations/platform-org-admin.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/platform-org-admin.ts tests/lib/validations/platform-org-admin.test.ts
git commit -m "$(cat <<'EOF'
feat: validate platform org-admin grant payload

EOF
)"
```

---

### Task 4: APIs GET/POST/DELETE

**Files:**
- Create: `src/app/api/plataforma/users/route.ts`
- Create: `src/app/api/plataforma/users/[userId]/memberships/[organizationId]/route.ts`
- Test: `tests/api/plataforma-users.test.ts`

Pattern: same as `src/app/api/plataforma/organizations/route.ts` — `requirePlatformAdmin()`, Zod, map domain errors, `mapPrismaError`.

HTTP mapping of `PlatformOrgAdminError`:

| code | status | message |
|------|--------|---------|
| `invalid_orgs` | 400 | `Una o más empresas no existen o están pausadas.` |
| `password_required` | 400 | `La contraseña es obligatoria para una cuenta nueva.` |
| `not_found` | 404 | `No encontramos esa membresía.` |
| `not_org_admin` | 409 | `Solo se puede quitar el acceso de administrador de empresa.` |

Unauthorized (`requirePlatformAdmin` throws `Error('Unauthorized')`) → 401 via `mapPrismaError` or catch-all like organizations route.

POST status: **201** if `result.created`, **200** otherwise. Body: `result.user` (shape of a GET item). DELETE: **204** empty.

- [ ] **Step 1: Write the failing API tests**

Create `tests/api/plataforma-users.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlatformOrgAdminError } from '@/lib/platform-org-admins'

vi.mock('@/lib/auth', () => ({
  requirePlatformAdmin: vi.fn(),
}))

vi.mock('@/lib/platform-org-admins', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/platform-org-admins')>()
  return {
    ...actual,
    grantOrgAdminAccess: vi.fn(),
    listOrgAdmins: vi.fn(),
    revokeOrgAdminMembership: vi.fn(),
  }
})

import { requirePlatformAdmin } from '@/lib/auth'
import {
  grantOrgAdminAccess,
  listOrgAdmins,
  revokeOrgAdminMembership,
} from '@/lib/platform-org-admins'
import { GET, POST } from '@/app/api/plataforma/users/route'
import { DELETE } from '@/app/api/plataforma/users/[userId]/memberships/[organizationId]/route'

const ana = {
  id: 'user-1',
  email: 'ana@liga.com',
  name: 'Ana Pérez',
  organizations: [
    { id: 'org-kelme', slug: 'kelme', name: 'Torneos Kelme', status: 'ACTIVE' },
  ],
}

describe('GET /api/plataforma/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requirePlatformAdmin).mockResolvedValue({ user: { id: 'admin' } } as never)
  })

  it('lists org admins', async () => {
    vi.mocked(listOrgAdmins).mockResolvedValue([ana])
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([ana])
  })

  it('returns 401 without platform admin', async () => {
    vi.mocked(requirePlatformAdmin).mockRejectedValue(new Error('Unauthorized'))
    const response = await GET()
    expect(response.status).toBe(401)
  })
})

describe('POST /api/plataforma/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requirePlatformAdmin).mockResolvedValue({ user: { id: 'admin' } } as never)
  })

  function post(body: unknown) {
    return POST(
      new Request('http://localhost/api/plataforma/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
  }

  it('returns 201 when a user is created', async () => {
    vi.mocked(grantOrgAdminAccess).mockResolvedValue({ created: true, user: ana })
    const response = await post({
      email: 'ana@liga.com',
      name: 'Ana Pérez',
      password: 'secret1',
      organizationIds: ['org-kelme'],
    })
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(ana)
  })

  it('returns 200 when an existing user is granted access', async () => {
    vi.mocked(grantOrgAdminAccess).mockResolvedValue({ created: false, user: ana })
    const response = await post({
      email: 'ana@liga.com',
      name: 'Ana Pérez',
      organizationIds: ['org-kelme'],
    })
    expect(response.status).toBe(200)
  })

  it('returns 400 for invalid body', async () => {
    const response = await post({ email: 'nope', name: 'A', organizationIds: [] })
    expect(response.status).toBe(400)
    expect(grantOrgAdminAccess).not.toHaveBeenCalled()
  })

  it('returns 400 when orgs are paused', async () => {
    vi.mocked(grantOrgAdminAccess).mockRejectedValue(new PlatformOrgAdminError('invalid_orgs'))
    const response = await post({
      email: 'ana@liga.com',
      name: 'Ana Pérez',
      password: 'secret1',
      organizationIds: ['org-kelme'],
    })
    expect(response.status).toBe(400)
  })

  it('returns 401 without platform admin', async () => {
    vi.mocked(requirePlatformAdmin).mockRejectedValue(new Error('Unauthorized'))
    const response = await post({
      email: 'ana@liga.com',
      name: 'Ana Pérez',
      password: 'secret1',
      organizationIds: ['org-kelme'],
    })
    expect(response.status).toBe(401)
  })
})

describe('DELETE /api/plataforma/users/:userId/memberships/:organizationId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requirePlatformAdmin).mockResolvedValue({ user: { id: 'admin' } } as never)
  })

  function del() {
    return DELETE(new Request('http://localhost', { method: 'DELETE' }), {
      params: Promise.resolve({ userId: 'user-1', organizationId: 'org-kelme' }),
    })
  }

  it('returns 204 when an ORG_ADMIN membership is removed', async () => {
    vi.mocked(revokeOrgAdminMembership).mockResolvedValue(undefined)
    const response = await del()
    expect(response.status).toBe(204)
    expect(revokeOrgAdminMembership).toHaveBeenCalledWith('user-1', 'org-kelme')
  })

  it('returns 409 when the role is not ORG_ADMIN', async () => {
    vi.mocked(revokeOrgAdminMembership).mockRejectedValue(
      new PlatformOrgAdminError('not_org_admin'),
    )
    const response = await del()
    expect(response.status).toBe(409)
  })

  it('returns 404 when membership is missing', async () => {
    vi.mocked(revokeOrgAdminMembership).mockRejectedValue(new PlatformOrgAdminError('not_found'))
    const response = await del()
    expect(response.status).toBe(404)
  })

  it('returns 401 without platform admin', async () => {
    vi.mocked(requirePlatformAdmin).mockRejectedValue(new Error('Unauthorized'))
    const response = await del()
    expect(response.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/plataforma-users.test.ts`

Expected: FAIL because the route modules do not exist.

- [ ] **Step 3: Implement routes**

Create `src/app/api/plataforma/users/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth'
import { mapPrismaError } from '@/lib/prisma-errors'
import {
  PlatformOrgAdminError,
  grantOrgAdminAccess,
  listOrgAdmins,
} from '@/lib/platform-org-admins'
import { grantOrgAdminAccessSchema } from '@/lib/validations/platform-org-admin'

function mapPlatformOrgAdminError(error: PlatformOrgAdminError) {
  if (error.code === 'invalid_orgs') {
    return NextResponse.json(
      { error: 'Una o más empresas no existen o están pausadas.' },
      { status: 400 },
    )
  }
  if (error.code === 'password_required') {
    return NextResponse.json(
      { error: 'La contraseña es obligatoria para una cuenta nueva.' },
      { status: 400 },
    )
  }
  if (error.code === 'not_found') {
    return NextResponse.json({ error: 'No encontramos esa membresía.' }, { status: 404 })
  }
  if (error.code === 'not_org_admin') {
    return NextResponse.json(
      { error: 'Solo se puede quitar el acceso de administrador de empresa.' },
      { status: 409 },
    )
  }
  return NextResponse.json({ error: 'No pudimos completar la operación.' }, { status: 500 })
}

export async function GET() {
  try {
    await requirePlatformAdmin()
    const users = await listOrgAdmins()
    return NextResponse.json(users)
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    await requirePlatformAdmin()
    const parsed = grantOrgAdminAccessSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const result = await grantOrgAdminAccess(parsed.data)
    return NextResponse.json(result.user, { status: result.created ? 201 : 200 })
  } catch (error) {
    if (error instanceof PlatformOrgAdminError) {
      return mapPlatformOrgAdminError(error)
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
```

Create `src/app/api/plataforma/users/[userId]/memberships/[organizationId]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth'
import { mapPrismaError } from '@/lib/prisma-errors'
import {
  PlatformOrgAdminError,
  revokeOrgAdminMembership,
} from '@/lib/platform-org-admins'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string; organizationId: string }> },
) {
  try {
    await requirePlatformAdmin()
    const { userId, organizationId } = await params
    await revokeOrgAdminMembership(userId, organizationId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof PlatformOrgAdminError) {
      if (error.code === 'not_found') {
        return NextResponse.json({ error: 'No encontramos esa membresía.' }, { status: 404 })
      }
      if (error.code === 'not_org_admin') {
        return NextResponse.json(
          { error: 'Solo se puede quitar el acceso de administrador de empresa.' },
          { status: 409 },
        )
      }
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
```

Do **not** extract `mapPlatformOrgAdminError` to a shared module in this task (YAGNI). Duplicate the two DELETE messages; they match the spec.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/api/plataforma-users.test.ts tests/lib/platform-org-admins.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/plataforma/users tests/api/plataforma-users.test.ts
git commit -m "$(cat <<'EOF'
feat: add platform APIs to grant and revoke org admins

EOF
)"
```

---

### Task 5: UI `/plataforma/usuarios`

**Files:**
- Create: `src/app/plataforma/usuarios/page.tsx`
- Create: `src/components/plataforma/PlatformOrgAdminForm.tsx`
- Create: `src/components/plataforma/PlatformOrgAdminTable.tsx`
- Modify: `src/app/plataforma/layout.tsx` (add nav link **Usuarios** between Empresas and Árbitros)

No dedicated component test (this repo does not test platform forms with RTL). Manual check is the last step.

- [ ] **Step 1: Add the Usuarios nav link**

In `src/app/plataforma/layout.tsx`, insert after the Empresas link:

```tsx
            <Link href="/plataforma/usuarios" className="text-zinc-300 hover:text-white">
              Usuarios
            </Link>
```

Keep Empresas, Árbitros, Apps. Do not rename AdminTorneo yet (Task 7).

- [ ] **Step 2: Create the form** `src/components/plataforma/PlatformOrgAdminForm.tsx`

Follow `OrganizationCreateForm`: client component, `fetch` POST, `router.refresh()`, error under the form.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type OrgOption = { id: string; slug: string; name: string }

export function PlatformOrgAdminForm({ organizations }: { organizations: OrgOption[] }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const data = new FormData(form)
    const organizationIds = data.getAll('organizationIds').map(String)
    const password = String(data.get('password') ?? '')

    const res = await fetch('/api/plataforma/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: String(data.get('email') ?? ''),
        name: String(data.get('name') ?? ''),
        password: password.length > 0 ? password : undefined,
        organizationIds,
      }),
    })

    if (!res.ok) {
      setLoading(false)
      const body = (await res.json().catch(() => null)) as { error?: unknown } | null
      setError(
        typeof body?.error === 'string'
          ? body.error
          : 'No pudimos dar el acceso. Revisa los datos e intenta de nuevo.',
      )
      return
    }

    router.refresh()
    form.reset()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
      <h2 className="font-display text-lg font-semibold text-zinc-900">Dar acceso</h2>
      <p className="font-ui text-sm text-zinc-600">
        Si el correo ya existe, se reutiliza la cuenta (sin cambiar nombre ni contraseña) y se suma
        como administrador de las empresas que marques.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="email" type="email" placeholder="Email" required className="input-kelme" />
        <input name="name" placeholder="Nombre" required minLength={2} className="input-kelme" />
        <input
          name="password"
          type="password"
          placeholder="Contraseña (solo cuenta nueva)"
          minLength={6}
          className="input-kelme sm:col-span-2"
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="font-ui text-sm font-medium text-zinc-700">Empresas</legend>
        {organizations.length === 0 ? (
          <p className="font-ui text-sm text-zinc-500">No hay empresas activas.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {organizations.map((org) => (
              <li key={org.id}>
                <label className="flex items-center gap-2 font-ui text-sm text-zinc-800">
                  <input type="checkbox" name="organizationIds" value={org.id} className="rounded" />
                  <span>
                    {org.name}{' '}
                    <span className="text-zinc-500">/{org.slug}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      {error && <p className="font-ui text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="rounded-md bg-zinc-900 px-4 py-2 text-white">
        {loading ? 'Guardando…' : 'Dar acceso'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Create the table** `src/components/plataforma/PlatformOrgAdminTable.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OrgAdminUser } from '@/lib/platform-org-admins'

export function PlatformOrgAdminTable({ users }: { users: OrgAdminUser[] }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState<string | null>(null)

  async function revoke(userId: string, organizationId: string) {
    setError('')
    setPending(`${userId}:${organizationId}`)
    const res = await fetch(
      `/api/plataforma/users/${userId}/memberships/${organizationId}`,
      { method: 'DELETE' },
    )
    setPending(null)
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      setError(body?.error ?? 'No pudimos quitar el acceso.')
      return
    }
    router.refresh()
  }

  if (users.length === 0) {
    return (
      <p className="font-ui text-sm text-zinc-500">Aún no hay administradores de empresa.</p>
    )
  }

  return (
    <div className="space-y-3">
      {error && <p className="font-ui text-sm text-red-600">{error}</p>}
      <section className="rounded-lg border border-zinc-200 bg-white">
        <ul className="divide-y divide-zinc-100">
          {users.map((user) => (
            <li key={user.id} className="space-y-2 px-4 py-4">
              <div>
                <p className="font-ui font-medium text-zinc-900">{user.name}</p>
                <p className="font-ui text-sm text-zinc-500">{user.email}</p>
              </div>
              <ul className="flex flex-wrap gap-2">
                {user.organizations.map((org) => {
                  const key = `${user.id}:${org.id}`
                  return (
                    <li
                      key={org.id}
                      className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 font-ui text-sm"
                    >
                      <span>
                        {org.name}
                        {org.status === 'PAUSED' ? ' (pausada)' : ''}
                      </span>
                      <button
                        type="button"
                        disabled={pending === key}
                        onClick={() => revoke(user.id, org.id)}
                        className="text-zinc-500 hover:text-red-600"
                      >
                        Quitar
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Create the page** `src/app/plataforma/usuarios/page.tsx`

Server component, same `dynamic = 'force-dynamic'` as Empresas. Filter ACTIVE orgs for checkboxes. Title **Administradores de empresa** (spec: no decir “usuarios de LigaLab”).

```tsx
import { listOrganizations } from '@/lib/organizations'
import { listOrgAdmins } from '@/lib/platform-org-admins'
import { PlatformOrgAdminForm } from '@/components/plataforma/PlatformOrgAdminForm'
import { PlatformOrgAdminTable } from '@/components/plataforma/PlatformOrgAdminTable'

export const dynamic = 'force-dynamic'

export default async function PlataformaUsuariosPage() {
  const [organizations, users] = await Promise.all([listOrganizations(), listOrgAdmins()])
  const active = organizations
    .filter((org) => org.status === 'ACTIVE')
    .map((org) => ({ id: org.id, slug: org.slug, name: org.name }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-zinc-900">Administradores de empresa</h1>
        <p className="mt-1 font-ui text-sm text-zinc-600">
          Da acceso de administrador a una o más ligas. Puedes quitar una empresa sin borrar la
          cuenta.
        </p>
      </div>

      <PlatformOrgAdminForm organizations={active} />
      <PlatformOrgAdminTable users={users} />
    </div>
  )
}
```

The layout already redirects non-platform-admins to `/login`. Do not call `requirePlatformAdmin()` in the page (it throws instead of redirecting).

- [ ] **Step 5: Typecheck the new files**

Run: `npx tsc --noEmit --pretty false`

If `tsc` is slow because of the whole app, at least run:

`npx vitest run tests/api/plataforma-users.test.ts tests/lib/platform-org-admins.test.ts`

Expected: PASS. Fix any type errors in the new components before committing.

- [ ] **Step 6: Commit**

```bash
git add src/app/plataforma/usuarios src/components/plataforma/PlatformOrgAdminForm.tsx src/components/plataforma/PlatformOrgAdminTable.tsx src/app/plataforma/layout.tsx
git commit -m "$(cat <<'EOF'
feat: add platform page to manage company admins

EOF
)"
```

---

### Task 6: Cookie `ligalab.org`

**Files:**
- Modify: `src/lib/org-cookie.ts` (only the constant)
- Test: `tests/lib/org-cookie.test.ts`

Callers already import `ORG_COOKIE` (`src/lib/auth.ts`, `src/lib/tenant-access.ts`). Changing the constant is enough. Do **not** dual-read `admintorneo.org`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/org-cookie.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ORG_COOKIE, clearOrgCookieOptions, orgCookieOptions } from '@/lib/org-cookie'

describe('ORG_COOKIE', () => {
  it('uses the LigaLab cookie name', () => {
    expect(ORG_COOKIE).toBe('ligalab.org')
    expect(orgCookieOptions('org-1').name).toBe('ligalab.org')
    expect(clearOrgCookieOptions().name).toBe('ligalab.org')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/org-cookie.test.ts`

Expected: FAIL — received `admintorneo.org`.

- [ ] **Step 3: Change the constant**

In `src/lib/org-cookie.ts`:

```ts
export const ORG_COOKIE = 'ligalab.org'
```

Leave `orgCookieOptions` / `clearOrgCookieOptions` unchanged.

- [ ] **Step 4: Run test**

Run: `npx vitest run tests/lib/org-cookie.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/org-cookie.ts tests/lib/org-cookie.test.ts
git commit -m "$(cat <<'EOF'
feat: rename active-org cookie to ligalab.org

EOF
)"
```

---

### Task 7: Rename visible copy to LigaLab

**Files to change (product title AdminTorneo → LigaLab):**

| File | What to replace |
|------|-----------------|
| `src/app/layout.tsx` | `default`, `template`, `appleWebApp.title` |
| `src/app/(auth)/login/page.tsx` | “Accede a AdminTorneo” y el span del logo |
| `src/components/marketing/ProductLanding.tsx` | `productName` y el `<h1>` |
| `src/components/kelme/MarketingShell.tsx` | default `productName = 'LigaLab'` |
| `src/app/plataforma/layout.tsx` | span del header |
| `src/app/plataforma/page.tsx` | “ligas en LigaLab” |
| `src/components/admin/AdminShell.tsx` | título + monograma `AT` → `LL` |
| `public/manifest.json` | `name` y `short_name` |

**Do not change:**

- `src/lib/mobile-edition-slug.ts` (`cl.admintorneo.${organizationSlug}.${seasonKey}`)
- `tests/lib/mobile-edition-scaffold.test.ts` (expects `cl.admintorneo.kelme.`)
- `src/lib/help-content.ts` — hoy habla de **Torneos Kelme** (tenant), no del producto. No hay “AdminTorneo” que reemplazar.
- Comentarios internos, nombres de variables, host `torneos-kelme.vercel.app`.

- [ ] **Step 1: Write the failing copy smoke test**

Create `tests/lib/product-name.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

describe('LigaLab product name', () => {
  it('uses LigaLab in root metadata and landing, not AdminTorneo as product title', () => {
    const layout = read('src/app/layout.tsx')
    expect(layout).toContain("default: 'LigaLab'")
    expect(layout).toContain("template: '%s · LigaLab'")
    expect(layout).not.toContain("'AdminTorneo'")

    const landing = read('src/components/marketing/ProductLanding.tsx')
    expect(landing).toContain("productName=\"LigaLab\"")
    expect(landing).toContain('LigaLab')
    expect(landing).not.toContain('AdminTorneo')

    const manifest = read('public/manifest.json')
    expect(manifest).toContain('"name": "LigaLab"')
    expect(manifest).not.toContain('AdminTorneo')
  })

  it('keeps the native bundle id prefix cl.admintorneo', () => {
    const source = read('src/lib/mobile-edition-slug.ts')
    expect(source).toContain('cl.admintorneo.')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/product-name.test.ts`

Expected: FAIL — files still say AdminTorneo.

- [ ] **Step 3: Replace copy**

`src/app/layout.tsx` metadata:

```ts
export const metadata: Metadata = {
  title: {
    default: 'LigaLab',
    template: '%s · LigaLab',
  },
  description: 'Plataforma SaaS para administrar ligas de fútbol con marcador en vivo',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'LigaLab',
  },
}
```

`src/app/(auth)/login/page.tsx`:

- `Accede a LigaLab`
- span del logo: `LigaLab`

`src/components/marketing/ProductLanding.tsx`:

- `<MarketingShell productName="LigaLab">`
- `<h1>…LigaLab</h1>`

`src/components/kelme/MarketingShell.tsx`:

```ts
export function MarketingShell({ children, productName = 'LigaLab', active }: Props) {
```

`src/app/plataforma/layout.tsx` header span: `LigaLab`

`src/app/plataforma/page.tsx`:

```
Gestiona las organizaciones que administran ligas en LigaLab.
```

`src/components/admin/AdminShell.tsx`:

- monograma `AT` → `LL`
- texto `AdminTorneo` → `LigaLab`

`public/manifest.json`:

```json
"name": "LigaLab",
"short_name": "LigaLab",
```

After edits, grep to confirm no leftover **product** title:

Run: `npx vitest run tests/lib/product-name.test.ts`

Also search the repo (do not “fix” bundle id hits):

```
rg "AdminTorneo" --glob "!docs/**" --glob "!*.md"
```

Allowed leftovers: none in `src/` or `public/` except none — bundle id is `cl.admintorneo`, not `AdminTorneo`. Docs under `docs/superpowers/` may still say AdminTorneo historically; do not rewrite old specs.

- [ ] **Step 4: Run related tests**

Run:

```
npx vitest run tests/lib/product-name.test.ts tests/lib/org-cookie.test.ts tests/lib/mobile-edition-scaffold.test.ts tests/lib/mobile-edition-slug.test.ts
```

Expected: PASS. Bundle id tests still expect `cl.admintorneo`.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx "src/app/(auth)/login/page.tsx" src/components/marketing/ProductLanding.tsx src/components/kelme/MarketingShell.tsx src/app/plataforma/layout.tsx src/app/plataforma/page.tsx src/components/admin/AdminShell.tsx public/manifest.json tests/lib/product-name.test.ts
git commit -m "$(cat <<'EOF'
feat: rename visible product to LigaLab

EOF
)"
```

---

### Task 8: Verificación final

- [ ] **Step 1: Run the new + related suite**

```
npx vitest run tests/lib/platform-org-admins.test.ts tests/lib/validations/platform-org-admin.test.ts tests/api/plataforma-users.test.ts tests/lib/org-cookie.test.ts tests/lib/product-name.test.ts tests/lib/mobile-edition-scaffold.test.ts
```

Expected: all PASS.

- [ ] **Step 2: Confirm out-of-scope files were not modified**

```
git diff --name-only origin/main...HEAD
```

Must **not** include:

- `src/app/api/users/route.ts` (or any `src/app/api/users/**` except the new `plataforma/users`)
- `src/lib/mobile-edition-slug.ts`
- `prisma/schema.prisma` / migrations

- [ ] **Step 3: Self-check vs spec** (no extra commit unless something failed)

- GET/POST `/api/plataforma/users` + DELETE membership: Task 4
- Promote PLAYER → ORG_ADMIN: Task 1
- Paused org rolls back (no transaction): Task 1
- GET excludes non-admins: Task 2 (`where: memberships some ORG_ADMIN`)
- Nav Usuarios + copy “Administradores de empresa”: Task 5
- Cookie `ligalab.org`: Task 6
- LigaLab copy + bundle id intact: Task 7
- No `isPlatformAdmin` toggle, no invites, no user delete

If a check fails, fix in the relevant task file and add a commit `fix: …` — do not amend unless the last commit is yours, unpushed, and a hook rewrote files.

---

## Self-review vs spec

| Spec | Task |
|------|------|
| Rol solo `ORG_ADMIN` | 1, 5 (checkboxes de empresas, sin selector de rol) |
| Reusar email, no pisar name/password | 1 |
| Password obligatorio solo en alta nueva | 1, 3, 4, 5 (campo opcional) |
| Promover otro rol | 1 |
| Org pausada / desconocida → 400, nada persistido | 1, 4 |
| GET lista admins ordenados por nombre | 2 |
| DELETE 204 / 404 / 409 | 2, 4 |
| 401 sin platform admin | 4 |
| UI `/plataforma/usuarios` + nav | 5 |
| Cookie `ligalab.org`, sin dual-read | 6 |
| Copy LigaLab, no bundle id | 7 |
| No `POST /api/users`, no Prisma migration | constraints + Task 8 |

No placeholders. Types (`OrgAdminUser`, `grantOrgAdminAccess` return `{ created, user }`, error codes) are consistent across tasks.
