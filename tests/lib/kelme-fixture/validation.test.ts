import { describe, expect, it } from 'vitest'
import { validateResult, type ResultInput } from '@/lib/kelme-fixture/validation'

const base: ResultInput = {
  phase: 'GROUP',
  status: 'FINAL',
  homeTeamId: 'a',
  awayTeamId: 'b',
  homeGoals: 2,
  awayGoals: 1,
  confirmFinal: true,
  drawPolicy: 'PENALTIES_REQUIRED',
}

describe('validateResult', () => {
  it('acepta un resultado final válido', () => {
    const out = validateResult(base)
    expect(out).toMatchObject({ ok: true, value: { homeGoals: 2, awayGoals: 1, decidedBy: 'REGULAR_TIME' } })
  })

  it('rechaza goles negativos, decimales o ausentes', () => {
    for (const bad of [-1, 1.5, null, undefined, 100]) {
      expect(validateResult({ ...base, homeGoals: bad as number }).ok).toBe(false)
    }
  })

  it('rechaza equipos iguales o por definir', () => {
    expect(validateResult({ ...base, awayTeamId: 'a' }).ok).toBe(false)
    expect(validateResult({ ...base, homeTeamId: null }).ok).toBe(false)
  })

  it('exige confirmar el cierre del partido', () => {
    expect(validateResult({ ...base, confirmFinal: false }).ok).toBe(false)
  })

  it('permite empate en fase de grupos', () => {
    expect(validateResult({ ...base, homeGoals: 1, awayGoals: 1 }).ok).toBe(true)
  })

  it('un partido programado se guarda sin goles ni cierre', () => {
    const out = validateResult({ ...base, status: 'SCHEDULED', homeGoals: null, awayGoals: null, confirmFinal: false })
    expect(out).toMatchObject({ ok: true, value: { status: 'SCHEDULED', homeGoals: 0, awayGoals: 0 } })
  })

  it('en definiciones exige penales ante empate si la política es PENALTIES_REQUIRED', () => {
    const draw = { ...base, phase: 'FINAL' as const, homeGoals: 1, awayGoals: 1 }
    expect(validateResult(draw).ok).toBe(false)
    const withPens = validateResult({ ...draw, penaltyHome: 3, penaltyAway: 2 })
    expect(withPens).toMatchObject({ ok: true, value: { decidedBy: 'PENALTIES', penaltyHome: 3, penaltyAway: 2 } })
  })

  it('rechaza penales empatados, o penales sin empate o fuera de definiciones', () => {
    const draw = { ...base, phase: 'FINAL' as const, homeGoals: 1, awayGoals: 1 }
    expect(validateResult({ ...draw, penaltyHome: 2, penaltyAway: 2 }).ok).toBe(false)
    expect(validateResult({ ...draw, homeGoals: 2, penaltyHome: 3, penaltyAway: 2 }).ok).toBe(false)
    expect(validateResult({ ...base, penaltyHome: 3, penaltyAway: 2 }).ok).toBe(false)
  })

  it('permite el empate en definiciones si la política lo autoriza', () => {
    const draw = { ...base, phase: 'FIFTH_PLACE' as const, homeGoals: 0, awayGoals: 0, drawPolicy: 'DRAW_ALLOWED' as const }
    expect(validateResult(draw).ok).toBe(true)
  })

  it('un partido anulado ignora los goles', () => {
    const out = validateResult({ ...base, status: 'CANCELLED', homeTeamId: null })
    expect(out).toMatchObject({ ok: true, value: { status: 'CANCELLED', homeGoals: 0 } })
  })
})
