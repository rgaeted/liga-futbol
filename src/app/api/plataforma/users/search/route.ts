import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth'
import { mapPrismaError } from '@/lib/prisma-errors'
import { searchPlatformUsers } from '@/lib/platform-org-admins'

export async function GET(req: Request) {
  try {
    await requirePlatformAdmin()
    const q = new URL(req.url).searchParams.get('q') ?? ''
    const users = await searchPlatformUsers(q)
    return NextResponse.json(users)
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
