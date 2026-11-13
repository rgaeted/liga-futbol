'use client'

import { useRouter } from 'next/navigation'
import { EditorialImageUpload } from '@/components/admin/content/EditorialImageUpload'

/** Logo del auspiciador: es la imagen que se ve en la franja, las tarjetas y las canchas del landing. */
export function SponsorLogoUpload({
  seasonId,
  sponsorId,
  logoUrl,
}: {
  seasonId: string
  sponsorId: string
  logoUrl: string | null
}) {
  const router = useRouter()
  const url = `/api/admin/seasons/${seasonId}/sponsors/${sponsorId}/logo`

  return (
    <div className="space-y-2">
      <EditorialImageUpload
        label="Logo del auspiciador"
        fieldName="logo"
        uploadUrl={url}
        deleteUrl={url}
        previewUrl={logoUrl}
        onUploaded={() => router.refresh()}
      />
      <p className="text-xs text-kelme-gray-600">
        JPG, PNG o WebP. Se ve mejor un logo con fondo transparente o blanco.
      </p>
    </div>
  )
}
