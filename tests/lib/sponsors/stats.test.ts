import { describe, expect, it } from 'vitest'
import { looksLikeBot, resolveClickTarget, statMonth } from '@/lib/sponsors/stats'

describe('statMonth', () => {
  it('devuelve el inicio del mes en America/Santiago', () => {
    expect(statMonth(new Date('2026-11-12T15:00:00Z')).toISOString()).toBe('2026-11-01T03:00:00.000Z')
  })
  it('usa el mes de Santiago aunque en UTC ya sea el siguiente', () => {
    expect(statMonth(new Date('2026-12-01T02:30:00Z')).toISOString()).toBe('2026-11-01T03:00:00.000Z')
  })
  it('respeta el horario de verano', () => {
    expect(statMonth(new Date('2026-02-15T12:00:00Z')).toISOString()).toBe('2026-02-01T03:00:00.000Z')
  })
})

describe('looksLikeBot', () => {
  it('detecta bots y agentes vacíos', () => {
    for (const ua of ['Googlebot/2.1', 'facebookexternalhit/1.1', 'WhatsApp/2.23', 'Slackbot-LinkExpanding', null]) {
      expect(looksLikeBot(ua)).toBe(true)
    }
  })
  it('no marca un navegador móvil como bot', () => {
    expect(looksLikeBot('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36')).toBe(false)
  })
})

describe('resolveClickTarget', () => {
  it('usa el botón, cae a la web y devuelve null sin enlaces', () => {
    expect(resolveClickTarget({ ctaUrl: 'https://wa.me/1', websiteUrl: 'https://x.cl' }, 'cta')).toBe('https://wa.me/1')
    expect(resolveClickTarget({ ctaUrl: null, websiteUrl: 'https://x.cl' }, 'cta')).toBe('https://x.cl')
    expect(resolveClickTarget({ ctaUrl: null, websiteUrl: null }, 'cta')).toBeNull()
    expect(resolveClickTarget({ ctaUrl: 'javascript:alert(1)', websiteUrl: 'https://x.cl' }, 'cta')).toBe('https://x.cl')
    expect(resolveClickTarget({ ctaUrl: 'javascript:alert(1)', websiteUrl: null }, 'cta')).toBeNull()
    expect(resolveClickTarget({ ctaUrl: 'https://wa.me/1', websiteUrl: 'https://x.cl' }, 'web')).toBe('https://x.cl')
    expect(resolveClickTarget({ ctaUrl: 'https://wa.me/1', websiteUrl: null }, 'web')).toBe('https://wa.me/1')
  })
})
