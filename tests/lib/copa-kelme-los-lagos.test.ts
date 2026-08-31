// tests/lib/copa-kelme-los-lagos.test.ts
import { describe, expect, it } from 'vitest'
import {
  addDaysIso,
  buildGroupFixture,
  parseCupSeedArgs,
  scheduleCupMatches,
} from '@/lib/copa-kelme-los-lagos'

describe('buildGroupFixture', () => {
  it('builds a 4-team round-robin of 6 matches across 3 rounds', () => {
    const fixture = buildGroupFixture('4')
    expect(fixture.categoryKeys).toEqual(['infantil', 'finales'])
    expect(fixture.teamKeys).toEqual(['colo-colo', 'catolica', 'union', 'fv'])
    expect(fixture.matches).toHaveLength(6)
    expect(fixture.matches.map((m) => [m.round, m.slot, m.homeKey, m.awayKey, m.categoryKey])).toEqual([
      [1, 0, 'colo-colo', 'catolica', 'infantil'],
      [1, 1, 'union', 'fv', 'infantil'],
      [2, 0, 'colo-colo', 'union', 'infantil'],
      [2, 1, 'catolica', 'fv', 'infantil'],
      [3, 0, 'colo-colo', 'fv', 'infantil'],
      [3, 1, 'catolica', 'union', 'infantil'],
    ])
  })

  it('builds 6-team groups of 3 with 3 rounds and a bye per group', () => {
    const fixture = buildGroupFixture('6')
    expect(fixture.categoryKeys).toEqual(['grupo-a', 'grupo-b', 'finales'])
    expect(fixture.teamKeys).toEqual([
      'colo-colo',
      'catolica',
      'union',
      'fv',
      'austral',
      'club-6',
    ])
    expect(fixture.matches).toHaveLength(6)
    expect(fixture.matches.map((m) => [m.round, m.slot, m.homeKey, m.awayKey, m.categoryKey])).toEqual([
      [1, 0, 'colo-colo', 'catolica', 'grupo-a'],
      [1, 1, 'fv', 'austral', 'grupo-b'],
      [2, 0, 'colo-colo', 'union', 'grupo-a'],
      [2, 1, 'fv', 'club-6', 'grupo-b'],
      [3, 0, 'catolica', 'union', 'grupo-a'],
      [3, 1, 'austral', 'club-6', 'grupo-b'],
    ])
  })
})

describe('parseCupSeedArgs', () => {
  it('requires variant', () => {
    expect(parseCupSeedArgs(['--phase=grupos', '--start=2026-09-05'])).toEqual({
      ok: false,
      error: 'Usa --variant=4 o --variant=6',
    })
  })

  it('parses variant 4 grupos with start date', () => {
    expect(parseCupSeedArgs(['--variant=4', '--start=2026-09-05'])).toEqual({
      ok: true,
      value: {
        variant: '4',
        phase: 'grupos',
        startDate: '2026-09-05',
        venue: 'Por confirmar',
        dryRun: false,
        resetMatches: false,
      },
    })
  })

  it('parses dry-run, venue and finales', () => {
    expect(
      parseCupSeedArgs([
        '--variant=6',
        '--phase=finales',
        '--start=2026-09-26',
        '--venue=Cancha Municipal',
        '--dry-run',
        '--reset-matches',
      ]),
    ).toEqual({
      ok: true,
      value: {
        variant: '6',
        phase: 'finales',
        startDate: '2026-09-26',
        venue: 'Cancha Municipal',
        dryRun: true,
        resetMatches: true,
      },
    })
  })
})

describe('scheduleCupMatches', () => {
  it('places round 2 seven days later at 11:15 Chile', () => {
    const fixture = buildGroupFixture('4')
    const scheduled = scheduleCupMatches(fixture.matches, '2026-09-05')
    const round2Slot1 = scheduled.find((m) => m.round === 2 && m.slot === 1)
    expect(round2Slot1?.scheduledAt).toBe('2026-09-12T14:15:00.000Z')
  })
})

describe('addDaysIso', () => {
  it('adds 7 days without shifting the calendar day', () => {
    expect(addDaysIso('2026-09-05', 7)).toBe('2026-09-12')
  })
})
