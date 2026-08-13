# League Editorial CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let administrators publish season-scoped news, galleries, and sponsors that the public mobile API and Expo app can consume.

**Architecture:** Editorial metadata stays in PostgreSQL while images live in a public-read Supabase Storage bucket. Focused domain services own publication, visibility, pagination, and cleanup; authenticated admin routes mutate content, while public mobile routes serialize published records only.

**Tech Stack:** Next.js 16.2.9, Prisma 7/PostgreSQL, Supabase Storage, Zod 4, React 19, Vitest 4, shared `@liga/mobile-contracts`.

## Global Constraints

- Prerequisites: foundation plan complete through published season resolution, plus Expo plan Task 1 for shared editorial contracts.
- Use the `editorial` Supabase Storage bucket; never store galleries as PostgreSQL `Bytes`.
- Admin writes require `Role.ADMIN`.
- Public routes require a published edition and return only published/current content.
- Public DTOs never contain author IDs, editorial status, or storage paths.
- Uploads accept JPEG, PNG, and WebP up to 2 MiB.
- UI and errors use Chilean Spanish.
- Every route/page change follows the installed Next.js 16 guide under `node_modules/next/dist/docs/`.
- Deleting DB content performs best-effort Storage cleanup without leaving the DB request in a half-mutated state.

---

### Task 1: Editorial Data Model and Validation

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260812140000_editorial_cms/migration.sql`
- Create: `src/lib/validations/editorial.ts`
- Test: `tests/lib/validations-editorial.test.ts`

**Interfaces:**
- Produces enum `EditorialStatus { DRAFT, PUBLISHED }`.
- Produces enum `SponsorPlacement { HOME, SPONSORS_PAGE, FOOTER }`.
- Produces models `Article`, `Gallery`, `GalleryPhoto`, `Sponsor`.
- Produces create/update/reorder Zod schemas.

- [ ] **Step 1: Write failing validation tests**

```ts
it('rejects a sponsor whose end precedes its start', () => {
  expect(
    createSponsorSchema.safeParse({
      name: 'Kelme',
      startsAt: '2026-08-20T00:00:00.000Z',
      endsAt: '2026-08-19T00:00:00.000Z',
    }).success,
  ).toBe(false)
})

it('requires body text for a new article', () => {
  expect(createArticleSchema.safeParse({ title: 'Fecha 1', body: '' }).success).toBe(false)
})
```

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run tests/lib/validations-editorial.test.ts`

- [ ] **Step 3: Add models and relations**

`Article`, `Gallery`, and `Sponsor` belong to `Season`; `Article.authorId` belongs to `User`; `GalleryPhoto` cascades with `Gallery`. Add indexes for season, publication status/date, activity, and sort order.

- [ ] **Step 4: Implement validation**

Article title max 200, summary max 500, non-empty body. Gallery description max 1,000. Photo alt max 200 and caption max 500. Sponsor name max 120, valid optional URL, non-negative sort order, and valid date interval.

- [ ] **Step 5: Verify and commit**

Run: `npx prisma generate`
Run: `npx vitest run tests/lib/validations-editorial.test.ts`
Run: `npx tsc --noEmit`

```bash
git add prisma/schema.prisma prisma/migrations/20260812140000_editorial_cms src/lib/validations/editorial.ts tests/lib/validations-editorial.test.ts
git commit -m "feat: add season editorial content model"
```

### Task 2: Storage, Image Validation, and Publication Rules

**Files:**
- Modify: `.env.example`
- Create: `src/lib/editorial/storage.ts`
- Create: `src/lib/editorial/image.ts`
- Create: `src/lib/editorial/publication.ts`
- Test: `tests/lib/editorial-storage.test.ts`
- Test: `tests/lib/editorial-image.test.ts`
- Test: `tests/lib/editorial-publication.test.ts`

**Interfaces:**
- Produces: `uploadEditorialObject`, `deleteEditorialObject(s)`, `editorialPublicUrl`, `editorialStoragePath`.
- Produces: `validateEditorialImage(buffer, mimeType)`.
- Produces: `applyPublishTransition(status, publishedAt, now)`.

- [ ] **Step 1: Write failing image and path tests**

```ts
expect(validateEditorialImage(Buffer.alloc(1024), 'image/webp')).toEqual({ ok: true })
expect(validateEditorialImage(Buffer.alloc(2 * 1024 * 1024 + 1), 'image/webp')).toMatchObject({ ok: false })
expect(editorialStoragePath(['seasons', '../secret'])).toThrow()
```

- [ ] **Step 2: Write failing publication tests**

Assert draft-to-published sets `publishedAt = now`, subsequent edits preserve it, and published-to-draft clears it.

- [ ] **Step 3: Confirm RED**

Run: `npx vitest run tests/lib/editorial-storage.test.ts tests/lib/editorial-image.test.ts tests/lib/editorial-publication.test.ts`

- [ ] **Step 4: Implement Storage adapter**

Create a server-only Supabase client with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Read bucket name from `SUPABASE_STORAGE_BUCKET`, defaulting only in tests. Sanitize every path segment.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run tests/lib/editorial-storage.test.ts tests/lib/editorial-image.test.ts tests/lib/editorial-publication.test.ts`

```bash
git add .env.example src/lib/editorial tests/lib/editorial-storage.test.ts tests/lib/editorial-image.test.ts tests/lib/editorial-publication.test.ts
git commit -m "feat: add editorial media storage"
```

### Task 3: Article Domain and Admin API

**Files:**
- Create: `src/lib/editorial/articles.ts`
- Create: `src/app/api/admin/seasons/[seasonId]/articles/route.ts`
- Create: `src/app/api/admin/seasons/[seasonId]/articles/[articleId]/route.ts`
- Create: `src/app/api/admin/seasons/[seasonId]/articles/[articleId]/cover/route.ts`
- Test: `tests/lib/editorial-articles.test.ts`
- Test: `tests/api/admin-articles.test.ts`
- Test: `tests/api/admin-article-cover.test.ts`

**Interfaces:**
- Produces: `listAdminArticles`, `createArticle`, `updateArticle`, `deleteArticle`.
- Produces cover upload/delete endpoints.

- [ ] **Step 1: Test season scope and publication**

An update with season A and article from season B returns not found. Publish transition sets date. Delete returns the removed cover path for cleanup.

- [ ] **Step 2: Test admin route behavior**

Cover POST accepts multipart field `cover`; invalid mime/size returns 400. Missing admin role returns the existing authorization response. JSON bodies use Zod and `mapPrismaError`.

- [ ] **Step 3: Confirm RED**

Run: `npx vitest run tests/lib/editorial-articles.test.ts tests/api/admin-articles.test.ts tests/api/admin-article-cover.test.ts`

- [ ] **Step 4: Implement services and thin routes**

Create/update DB first; on cover replacement, upload deterministic path and then update DB. Delete the previous object only after the new path is persisted.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run tests/lib/editorial-articles.test.ts tests/api/admin-articles.test.ts tests/api/admin-article-cover.test.ts`

```bash
git add src/lib/editorial/articles.ts src/app/api/admin/seasons tests/lib/editorial-articles.test.ts tests/api/admin-articles.test.ts tests/api/admin-article-cover.test.ts
git commit -m "feat: add editorial article API"
```

### Task 4: Gallery and Photo Domain

**Files:**
- Create: `src/lib/editorial/galleries.ts`
- Create: `src/lib/editorial/gallery-photos.ts`
- Create: `src/app/api/admin/seasons/[seasonId]/galleries/route.ts`
- Create: `src/app/api/admin/seasons/[seasonId]/galleries/[galleryId]/route.ts`
- Create: `src/app/api/admin/seasons/[seasonId]/galleries/[galleryId]/cover/route.ts`
- Create: `src/app/api/admin/seasons/[seasonId]/galleries/[galleryId]/photos/route.ts`
- Create: `src/app/api/admin/seasons/[seasonId]/galleries/[galleryId]/photos/[photoId]/route.ts`
- Create: `src/app/api/admin/seasons/[seasonId]/galleries/[galleryId]/photos/reorder/route.ts`
- Test: `tests/lib/editorial-galleries.test.ts`
- Test: `tests/lib/editorial-gallery-photos.test.ts`
- Test: `tests/api/admin-galleries.test.ts`

**Interfaces:**
- Produces gallery CRUD, photo CRUD, and `reorderGalleryPhotos(galleryId, seasonId, photoIds)`.

- [ ] **Step 1: Write failing order and scope tests**

Reorder must contain every current photo exactly once, reject duplicates/foreign IDs, and update all sort positions in one transaction.

- [ ] **Step 2: Test media cleanup**

Deleting a gallery collects cover and photo paths. Storage failure is logged without resurrecting deleted DB rows.

- [ ] **Step 3: Confirm RED**

Run: `npx vitest run tests/lib/editorial-galleries.test.ts tests/lib/editorial-gallery-photos.test.ts tests/api/admin-galleries.test.ts`

- [ ] **Step 4: Implement domain and routes**

Use deterministic photo paths with generated IDs. Preserve supplied alt text/caption. Enforce season scope through the parent gallery query.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run tests/lib/editorial-galleries.test.ts tests/lib/editorial-gallery-photos.test.ts tests/api/admin-galleries.test.ts`

```bash
git add src/lib/editorial/galleries.ts src/lib/editorial/gallery-photos.ts src/app/api/admin/seasons tests/lib/editorial-galleries.test.ts tests/lib/editorial-gallery-photos.test.ts tests/api/admin-galleries.test.ts
git commit -m "feat: add editorial gallery API"
```

### Task 5: Sponsor Domain and Assets

**Files:**
- Create: `src/lib/editorial/sponsors.ts`
- Create: `src/app/api/admin/seasons/[seasonId]/sponsors/route.ts`
- Create: `src/app/api/admin/seasons/[seasonId]/sponsors/[sponsorId]/route.ts`
- Create: `src/app/api/admin/seasons/[seasonId]/sponsors/[sponsorId]/logo/route.ts`
- Create: `src/app/api/admin/seasons/[seasonId]/sponsors/[sponsorId]/banner/route.ts`
- Test: `tests/lib/editorial-sponsors.test.ts`
- Test: `tests/api/admin-sponsors.test.ts`

**Interfaces:**
- Produces: `isSponsorPubliclyVisible(sponsor, now)`.
- Produces sponsor CRUD plus logo/banner upload/delete.

- [ ] **Step 1: Write failing visibility tests**

Test inactive, future, expired, open-ended, and currently active sponsors at a fixed UTC instant.

- [ ] **Step 2: Write failing route tests**

Assert cross-season resources are 404, blank website becomes null, and invalid interval returns 400.

- [ ] **Step 3: Confirm RED**

Run: `npx vitest run tests/lib/editorial-sponsors.test.ts tests/api/admin-sponsors.test.ts`

- [ ] **Step 4: Implement and verify**

Run: `npx vitest run tests/lib/editorial-sponsors.test.ts tests/api/admin-sponsors.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/editorial/sponsors.ts src/app/api/admin/seasons tests/lib/editorial-sponsors.test.ts tests/api/admin-sponsors.test.ts
git commit -m "feat: add season sponsor API"
```

### Task 6: Admin Content Navigation and Editors

**Files:**
- Modify: `src/app/(dashboard)/admin/layout.tsx`
- Create: `src/app/(dashboard)/admin/content/page.tsx`
- Create: `src/app/(dashboard)/admin/content/articles/page.tsx`
- Create: `src/app/(dashboard)/admin/content/articles/[id]/page.tsx`
- Create: `src/app/(dashboard)/admin/content/galleries/page.tsx`
- Create: `src/app/(dashboard)/admin/content/galleries/[id]/page.tsx`
- Create: `src/app/(dashboard)/admin/content/sponsors/page.tsx`
- Create: `src/app/api/admin/seasons/[seasonId]/mobile/logo/route.ts`
- Create: `src/components/admin/content/ContentSeasonBar.tsx`
- Create: `src/components/admin/content/MobileEditionLogoUpload.tsx`
- Create: `src/components/admin/content/ArticleForm.tsx`
- Create: `src/components/admin/content/ArticlesTable.tsx`
- Create: `src/components/admin/content/GalleryForm.tsx`
- Create: `src/components/admin/content/GalleriesTable.tsx`
- Create: `src/components/admin/content/GalleryPhotoGrid.tsx`
- Create: `src/components/admin/content/EditorialImageUpload.tsx`
- Create: `src/components/admin/content/SponsorForm.tsx`
- Create: `src/components/admin/content/SponsorsTable.tsx`
- Test: `tests/components/admin-content.test.tsx`
- Test: `tests/api/admin-mobile-season-logo.test.ts`
- Test: `tests/lib/admin-nav.test.ts`

**Interfaces:**
- Consumes admin APIs from Tasks 3–5.
- Produces the admin “Contenido” workflow scoped by `?season=`.

- [ ] **Step 1: Test serializable navigation**

Assert `Contenido` links to `/admin/content` and uses `activePrefixes`; do not introduce callback matchers across the Server→Client boundary.

- [ ] **Step 2: Test critical editor flows**

Create draft, publish article, upload cover, create gallery, add/reorder/delete photos, create scheduled sponsor, and upload/remove the edition logo. Mock `submitJson` and upload fetch.

- [ ] **Step 3: Confirm RED**

Run: `npx vitest run tests/components/admin-content.test.tsx tests/lib/admin-nav.test.ts`

- [ ] **Step 4: Implement focused components**

Use existing `AdminSeasonSelect`, `submitJson`, and upload component patterns. Show status, publication date, asset preview, and errors inline. The edition logo route updates `SeasonMobileConfig.logoStoragePath` only after a successful Storage upload and removes the prior object after the DB update.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run tests/components/admin-content.test.tsx tests/api/admin-mobile-season-logo.test.ts tests/lib/admin-nav.test.ts`
Run: `npx tsc --noEmit`

```bash
git add "src/app/(dashboard)/admin/content" "src/app/(dashboard)/admin/layout.tsx" src/app/api/admin/seasons src/components/admin/content tests/components/admin-content.test.tsx tests/api/admin-mobile-season-logo.test.ts tests/lib/admin-nav.test.ts
git commit -m "feat: add admin editorial workspace"
```

### Task 7: Public Editorial Serialization and API

**Files:**
- Create: `src/lib/editorial/mobile-serializers.ts`
- Create: `src/lib/editorial/public-queries.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/articles/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/articles/[articleId]/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/galleries/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/galleries/[galleryId]/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/sponsors/route.ts`
- Modify: `src/lib/mobile/home.ts`
- Modify: `src/lib/proxy-policy.ts`
- Modify: `tests/lib/proxy-policy.test.ts`
- Test: `tests/lib/editorial-mobile-serializers.test.ts`
- Test: `tests/api/mobile-editorial-routes.test.ts`

**Interfaces:**
- Consumes `@liga/mobile-contracts` editorial schemas and published league resolver.
- Produces public article/gallery/sponsor endpoints and home snippets.

- [ ] **Step 1: Test public data minimization**

DTO tests assert no `authorId`, `status`, `storagePath`, or internal mime fields. URLs are absolute and dates ISO. The league config serializer resolves `SeasonMobileConfig.logoStoragePath` through `editorialPublicUrl`.

- [ ] **Step 2: Test visibility and scope**

Unknown/unpublished slug, draft, or cross-season ID returns 404. Sponsor filters honor active dates at a fixed clock. Lists use cursor pagination with max 50.

- [ ] **Step 3: Test home composition**

Home includes only the latest published articles and active `HOME` sponsors, without failing if editorial tables are empty.

- [ ] **Step 4: Confirm RED**

Run: `npx vitest run tests/lib/editorial-mobile-serializers.test.ts tests/api/mobile-editorial-routes.test.ts tests/lib/proxy-policy.test.ts`

- [ ] **Step 5: Implement serializers, queries, routes, and whitelist**

Only GET editorial routes are public. Admin and upload routes retain auth.

- [ ] **Step 6: Verify and commit**

Run: `npx vitest run tests/lib/editorial-mobile-serializers.test.ts tests/api/mobile-editorial-routes.test.ts tests/lib/proxy-policy.test.ts`

```bash
git add src/lib/editorial src/lib/mobile/home.ts src/app/api/mobile src/lib/proxy-policy.ts tests
git commit -m "feat: publish editorial mobile API"
```

### Task 8: Storage Provisioning and End-to-End Smoke

**Files:**
- Create: `docs/deployment/editorial-storage.md`
- Modify: `docs/handoff/SESSION-CONTEXT.md` only after production deployment.

**Interfaces:**
- Produces an operational `editorial` bucket and deployment checklist.

- [ ] **Step 1: Provision preview Storage**

Create bucket `editorial`, allow public object reads, and keep writes service-role only. Set `SUPABASE_STORAGE_BUCKET=editorial` in preview.

- [ ] **Step 2: Run smoke flow**

Create a draft article and confirm mobile API 404; publish and confirm 200. Upload three gallery photos, reorder, and confirm API order. Create an active HOME sponsor and confirm home feed inclusion.

- [ ] **Step 3: Run complete verification**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Run: `npm run build`

- [ ] **Step 4: Document production provisioning**

Record bucket name, policies, env variables, upload limits, rollback, and orphan cleanup procedure without secrets.

- [ ] **Step 5: Commit**

```bash
git add docs/deployment/editorial-storage.md
git commit -m "docs: document editorial storage deployment"
```

## Plan Completion Gate

- Admin can draft and publish each content type for one season.
- Public endpoints never leak drafts or cross-season content.
- Mobile home receives current articles and HOME sponsors.
- Gallery photos are ordered and accessible from Storage.
- Deleting content performs deterministic DB mutation and best-effort object cleanup.
- Preview and production bucket setup is documented and verified.
