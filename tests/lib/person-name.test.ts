import { describe, expect, it } from 'vitest'
import { splitPersonName } from '@/lib/person-name'

describe('splitPersonName', () => {
  it('splits first token as firstName', () => {
    expect(splitPersonName('Juan Pérez Soto')).toEqual({
      firstName: 'Juan',
      lastName: 'Pérez Soto',
    })
  })

  it('uses Sin nombre when empty', () => {
    expect(splitPersonName('')).toEqual({ firstName: 'Sin nombre', lastName: '' })
    expect(splitPersonName('   ')).toEqual({ firstName: 'Sin nombre', lastName: '' })
  })

  it('keeps a single token as firstName', () => {
    expect(splitPersonName('Pelé')).toEqual({ firstName: 'Pelé', lastName: '' })
  })
})
