import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'
import { mapPrismaError } from '@/lib/prisma-errors'

describe('mapPrismaError', () => {
  it('maps duplicate email to 409', () => {
    const error = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['email'] },
    })
    expect(mapPrismaError(error)).toEqual({
      status: 409,
      message: 'Ese email ya está registrado.',
    })
  })

  it('maps unauthorized error to 401', () => {
    expect(mapPrismaError(new Error('Unauthorized'))).toEqual({
      status: 401,
      message: 'No autorizado.',
    })
  })
})
