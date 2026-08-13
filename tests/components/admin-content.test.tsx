import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('admin content workspace', () => {
  it('uses submitJson in article editor', () => {
    expect(read('src/components/admin/content/ArticlesTable.tsx')).toContain('submitJson')
    expect(read('src/components/admin/content/ArticlesTable.tsx')).toContain(
      '/api/admin/seasons/${seasonId}/articles',
    )
  })

  it('uses fetch uploads in EditorialImageUpload', () => {
    expect(read('src/components/admin/content/EditorialImageUpload.tsx')).toContain('fetch(uploadUrl')
    expect(read('src/components/admin/content/EditorialImageUpload.tsx')).toContain(
      'accept="image/jpeg,image/png,image/webp"',
    )
  })

  it('supports gallery photo reorder API', () => {
    expect(read('src/components/admin/content/GalleryPhotoGrid.tsx')).toContain('/photos/reorder')
  })

  it('scopes content pages by season query param', () => {
    expect(read('src/components/admin/content/ContentSeasonBar.tsx')).toContain("params.set('season'")
    expect(read('src/app/(dashboard)/admin/content/page.tsx')).toContain('ContentSeasonBar')
  })

  it('uploads edition logo through admin mobile logo route', () => {
    expect(read('src/components/admin/content/MobileEditionLogoUpload.tsx')).toContain(
      '/api/admin/seasons/${seasonId}/mobile/logo',
    )
  })
})
