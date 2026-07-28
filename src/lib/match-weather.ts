import { APP_TIMEZONE } from '@/lib/locale'
import { formatScheduleDateInput, formatScheduleTimeInput } from '@/lib/schedule-datetime'

export type MatchWeatherSnapshot = {
  weatherTempC: number
  weatherHumidityPct: number
  weatherWindKmh: number
  weatherCode: number
  weatherLabel: string
  weatherFetchedAt: Date
}

const WMO_LABELS: Record<number, string> = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna intensa',
  56: 'Llovizna helada ligera',
  57: 'Llovizna helada intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  66: 'Lluvia helada ligera',
  67: 'Lluvia helada intensa',
  71: 'Nieve ligera',
  73: 'Nieve moderada',
  75: 'Nieve intensa',
  77: 'Granizo',
  80: 'Chubascos ligeros',
  81: 'Chubascos moderados',
  82: 'Chubascos fuertes',
  85: 'Chubascos de nieve ligeros',
  86: 'Chubascos de nieve fuertes',
  95: 'Tormenta eléctrica',
  96: 'Tormenta con granizo ligero',
  99: 'Tormenta con granizo fuerte',
}

export function weatherCodeLabel(code: number): string {
  return WMO_LABELS[code] ?? 'Condición desconocida'
}

type HourlyWeatherResponse = {
  hourly?: {
    time?: string[]
    temperature_2m?: number[]
    relative_humidity_2m?: number[]
    weather_code?: number[]
    wind_speed_10m?: number[]
  }
  error?: boolean
  reason?: string
}

function targetHourIndex(times: string[], scheduledAt: Date): number {
  const targetHour = Number(formatScheduleTimeInput(scheduledAt, APP_TIMEZONE).slice(0, 2))
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY

  times.forEach((isoLocal, index) => {
    const hour = Number(isoLocal.slice(11, 13))
    const distance = Math.abs(hour - targetHour)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })

  return bestIndex
}

export async function fetchWeatherForMatch(input: {
  lat: number
  lon: number
  scheduledAt: Date
}): Promise<MatchWeatherSnapshot> {
  const date = formatScheduleDateInput(input.scheduledAt, APP_TIMEZONE)
  const isPast = input.scheduledAt.getTime() < Date.now() - 60 * 60 * 1000
  const baseUrl = isPast
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast'

  const url = new URL(baseUrl)
  url.searchParams.set('latitude', String(input.lat))
  url.searchParams.set('longitude', String(input.lon))
  url.searchParams.set('start_date', date)
  url.searchParams.set('end_date', date)
  url.searchParams.set('hourly', 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m')
  url.searchParams.set('timezone', APP_TIMEZONE)

  const res = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!res.ok) {
    throw new Error('No pudimos consultar el clima')
  }

  const data = (await res.json()) as HourlyWeatherResponse
  if (data.error) {
    throw new Error(data.reason ?? 'No pudimos consultar el clima')
  }

  const times = data.hourly?.time ?? []
  if (times.length === 0) {
    throw new Error('No hay datos de clima para esa fecha')
  }

  const index = targetHourIndex(times, input.scheduledAt)
  const temp = data.hourly?.temperature_2m?.[index]
  const humidity = data.hourly?.relative_humidity_2m?.[index]
  const code = data.hourly?.weather_code?.[index]
  const wind = data.hourly?.wind_speed_10m?.[index]

  if (temp === undefined || humidity === undefined || code === undefined || wind === undefined) {
    throw new Error('No hay datos de clima para esa hora')
  }

  return {
    weatherTempC: Math.round(temp * 10) / 10,
    weatherHumidityPct: Math.round(humidity),
    weatherWindKmh: Math.round(wind * 10) / 10,
    weatherCode: code,
    weatherLabel: weatherCodeLabel(code),
    weatherFetchedAt: new Date(),
  }
}

export function formatMatchWeather(snapshot: {
  weatherTempC: number | null
  weatherHumidityPct: number | null
  weatherWindKmh: number | null
  weatherLabel: string | null
}): string | null {
  if (snapshot.weatherTempC === null || !snapshot.weatherLabel) return null
  const parts = [
    `${snapshot.weatherLabel} · ${snapshot.weatherTempC}°C`,
    snapshot.weatherHumidityPct !== null ? `${snapshot.weatherHumidityPct}% humedad` : null,
    snapshot.weatherWindKmh !== null ? `${snapshot.weatherWindKmh} km/h viento` : null,
  ].filter(Boolean)
  return parts.join(' · ')
}
