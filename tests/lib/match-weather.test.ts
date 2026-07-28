import { describe, expect, it } from 'vitest'
import { formatMatchWeather, weatherCodeLabel } from '@/lib/match-weather'

describe('match-weather', () => {
  it('maps known weather codes to Spanish labels', () => {
    expect(weatherCodeLabel(0)).toBe('Despejado')
    expect(weatherCodeLabel(61)).toBe('Lluvia ligera')
    expect(weatherCodeLabel(999)).toBe('Condición desconocida')
  })

  it('formats a weather snapshot', () => {
    expect(
      formatMatchWeather({
        weatherTempC: 18.5,
        weatherHumidityPct: 62,
        weatherWindKmh: 12.3,
        weatherLabel: 'Parcialmente nublado',
      })
    ).toBe('Parcialmente nublado · 18.5°C · 62% humedad · 12.3 km/h viento')
  })

  it('returns null when weather is incomplete', () => {
    expect(
      formatMatchWeather({
        weatherTempC: null,
        weatherHumidityPct: 62,
        weatherWindKmh: 12,
        weatherLabel: 'Nublado',
      })
    ).toBeNull()
  })
})
