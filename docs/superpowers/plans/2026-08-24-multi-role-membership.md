# Multi-rol por empresa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir múltiples roles por usuario/org, menú unificado, y DT amistoso solo al designar en roster.

**Architecture:** `OrganizationMembership.roles: MembershipRole[]`; helpers `hasAnyMembershipRole` / `canAccessAreas`; nav unificado vía `tenant-nav.ts`; roster sync usa `mergeMembershipRole`.

**Tech Stack:** Next.js 16, Prisma 7, PostgreSQL, Vitest

**Spec:** `docs/superpowers/specs/2026-08-24-multi-role-membership-design.md`

---

### Task 1: Schema + helpers

- [ ] Migración `roles[]` + backfill
- [ ] `membership-role.ts`: `hasAnyMembershipRole`, `canAccessAreas`, `resolvePrimaryDashboardPath`, `primaryMembershipRole`
- [ ] `membership-roles.ts`: `mergeMembershipRole`
- [ ] Tests helpers

### Task 2: Auth + tenant access

- [ ] `auth.ts`, `auth.config.ts`, `next-auth.d.ts`: `membershipRoles[]`
- [ ] `tenant-access.ts`, `requireOrgRole`

### Task 3: Roster + APIs usuarios

- [ ] `friendly-match-roster.ts`: merge, no overwrite PLAYER
- [ ] `validations/user.ts`: `roles[]`, sin FRIENDLY_COACH manual
- [ ] `api/users/*`

### Task 4: Nav unificado + layouts

- [ ] `tenant-nav.ts` + `loadTenantNavContext`
- [ ] Layouts admin/player/coach/referee

### Task 5: UI admin usuarios + display

- [ ] `UsersTable`, `UserForm`, `user-roles-display.ts`
- [ ] OrganizationSwitcher labels

### Task 6: Regresión tests + verify

- [ ] Actualizar tests rotos
- [ ] `npm test`
