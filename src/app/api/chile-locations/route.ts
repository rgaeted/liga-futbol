import { NextResponse } from 'next/server'
import { listChileCommunes, listChileRegions } from '@/lib/chile-locations'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const regionCode = searchParams.get('regionCode')

  if (regionCode) {
    const communes = listChileCommunes(regionCode).map((c) => ({
      code: c.code,
      name: c.name,
    }))
    return NextResponse.json({ communes })
  }

  const regions = listChileRegions()
  return NextResponse.json({ regions })
}
