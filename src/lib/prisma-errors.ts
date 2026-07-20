import { Prisma } from '@prisma/client'

export function mapPrismaError(error: unknown): { status: number; message: string } | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta.target as string[]).join(', ')
        : 'dato'
      if (target.includes('email')) {
        return { status: 409, message: 'Ese email ya está registrado.' }
      }
      return { status: 409, message: 'Ya existe un registro con esos datos.' }
    }
    if (error.code === 'P2025') {
      return { status: 404, message: 'Registro no encontrado.' }
    }
  }

  if (error instanceof Error && error.message === 'Unauthorized') {
    return { status: 401, message: 'No autorizado.' }
  }

  return null
}
