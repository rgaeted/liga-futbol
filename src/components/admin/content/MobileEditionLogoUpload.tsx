'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { EditorialImageUpload } from '@/components/admin/content/EditorialImageUpload'
import { editorialPublicUrl } from '@/lib/editorial/urls'

export function MobileEditionLogoUpload({
  seasonId,
  logoStoragePath,
}: {
  seasonId: string
  logoStoragePath: string | null
}) {
  const router = useRouter()
  const [previewPath, setPreviewPath] = useState(logoStoragePath)

  return (
    <EditorialImageUpload
      label="Logo de la edición móvil"
      fieldName="logo"
      uploadUrl={`/api/admin/seasons/${seasonId}/mobile/logo`}
      deleteUrl={`/api/admin/seasons/${seasonId}/mobile/logo`}
      previewUrl={editorialPublicUrl(previewPath)}
      onUploaded={() => {
        router.refresh()
        setPreviewPath(previewPath)
      }}
    />
  )
}
