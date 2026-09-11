import { ImageResponse } from 'next/og'
import { getLosLunesPlayerCard } from '@/lib/player-card-query'
import { LOSLUNES_SLUG } from '@/lib/org-brand'

export const dynamic = 'force-dynamic'

function formatStat(value: number | null): string {
  return value === null ? '–' : String(value)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ organizationSlug: string; playerId: string }> },
) {
  const { organizationSlug, playerId } = await params
  if (organizationSlug !== LOSLUNES_SLUG) {
    return new Response(null, { status: 404 })
  }
  const result = await getLosLunesPlayerCard(playerId)
  if (result.kind !== 'ok') {
    return new Response(null, { status: 404 })
  }

  const { player, crudos, atributos, ovr } = result.card

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B1210',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 520,
            padding: 4,
            background: '#C79A3E',
            borderRadius: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(172deg, #14241D 0%, #0C1611 62%, #0A130F 100%)',
              borderRadius: 22,
              padding: '36px 40px',
              color: '#EDF2EE',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    fontSize: 80,
                    color: '#E8C878',
                    lineHeight: 1,
                  }}
                >
                  {ovr ?? '–'}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#8BA598',
                    letterSpacing: '0.3em',
                    marginTop: 4,
                  }}
                >
                  OVR
                </div>
                <div
                  style={{
                    marginTop: 10,
                    padding: '6px 14px',
                    border: '1px solid rgba(61,230,140,0.3)',
                    background: 'rgba(61,230,140,0.14)',
                    borderRadius: 8,
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    fontSize: 22,
                    letterSpacing: '0.05em',
                  }}
                >
                  {player.posicion}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 28,
                textAlign: 'center',
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: 40,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              {player.nombreCorto}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                marginTop: 36,
              }}
            >
              {(['TIR', 'VIS', 'RES'] as const).map((key) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'Arial Black, Arial, sans-serif',
                      fontSize: 36,
                      color: '#E8C878',
                    }}
                  >
                    {formatStat(atributos[key])}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#8BA598',
                      letterSpacing: '0.15em',
                      marginTop: 4,
                    }}
                  >
                    {key}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: 36,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    fontSize: 32,
                    color: '#E8C878',
                  }}
                >
                  {crudos.goles}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#8BA598',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    marginTop: 4,
                  }}
                >
                  Goles 30d
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 20,
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#8BA598',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
              }}
            >
              Fútbol de los Lunes · LigaLab
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
