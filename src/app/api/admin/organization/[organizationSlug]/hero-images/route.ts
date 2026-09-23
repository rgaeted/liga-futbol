import { NextResponse } from 'next/server'
import { mapAdminOrgRouteError, mapHeroImageUploadError, requireOrgAdminForSlug } from '@/lib/admin-org-route'
import { enforceCapability } from '@/lib/billing/enforce'
import {
  editorialImageExtension,
  inferEditorialImageMimeType,
  validateEditorialImage,
} from '@/lib/editorial/image'
import { editorialStoragePath, uploadEditorialObject } from '@/lib/editorial/storage'
import { editorialPublicUrl } from '@/lib/editorial/urls'
import {
  addOrgHeroImage,
  listOrgHeroImages,
  newOrgHeroImageId,
  orgHeroImageStoragePath,
} from '@/lib/org-hero-images'
import { mapPrismaError } from '@/lib/prisma-errors'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ organizationSlug: string }> },
) {
  try {
    const { organizationSlug } = await params
    const { organizationId } = await requireOrgAdminForSlug(organizationSlug)
    const gate = await enforceCapability(organizationId, 'PUBLISH_ORG_LANDING')
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: 403 })
    }

    const images = await listOrgHeroImages(organizationId)
    return NextResponse.json({
      images: images.map((image) => ({
        id: image.id,
        storagePath: image.storagePath,
        url: editorialPublicUrl(image.storagePath),
        sortOrder: image.sortOrder,
      })),
    })
  } catch (error) {
    const mappedOrg = mapAdminOrgRouteError(error)
    if (mappedOrg) {
      return NextResponse.json({ error: mappedOrg.message }, { status: mappedOrg.status })
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ organizationSlug: string }> },
) {
  try {
    const { organizationSlug } = await params
    const { organizationId } = await requireOrgAdminForSlug(organizationSlug)
    const gate = await enforceCapability(organizationId, 'PUBLISH_ORG_LANDING')
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: 403 })
    }

    const form = await req.formData()
    const file = form.get('photo')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Debes enviar un archivo photo' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = inferEditorialImageMimeType(
      file.name,
      file.type || 'application/octet-stream',
    )
    const validation = validateEditorialImage(buffer, mimeType)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const imageId = newOrgHeroImageId()
    const ext = editorialImageExtension(mimeType)
    const storagePath = editorialStoragePath(
      orgHeroImageStoragePath(organizationId, imageId, ext).split('/'),
    )

    await uploadEditorialObject(storagePath, buffer, mimeType)
    const result = await addOrgHeroImage(organizationId, storagePath, mimeType)
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Ya alcanzaste el máximo de fotos del hero.' },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        image: {
          id: result.image.id,
          storagePath: result.image.storagePath,
          url: editorialPublicUrl(result.image.storagePath),
          sortOrder: result.image.sortOrder,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const mappedOrg = mapAdminOrgRouteError(error)
    if (mappedOrg) {
      return NextResponse.json({ error: mappedOrg.message }, { status: mappedOrg.status })
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    const upload = mapHeroImageUploadError(error)
    return NextResponse.json({ error: upload.message }, { status: upload.status })
  }
}
