import { PLAYER_CARD_HOT_THRESHOLD } from '@/lib/player-card'
import type { PlayerCardDto } from '@/lib/player-card-query'
import {
  formatPlayerCardStat,
  PLAYER_CARD_DISPLAY_FONT_OG,
  PLAYER_CARD_PALETTE as PALETTE,
  PLAYER_CARD_STAT_LABELS as STAT_LABELS,
  PLAYER_CARD_STAT_PAIRS as STAT_PAIRS,
  playerCardGolPorPartido,
  playerCardShieldHeight,
  playerCardShieldPath,
} from '@/lib/player-card-shield'
type Props = {
  card: PlayerCardDto
  fotoUrl: string
  escudoUrl: string
  width?: number
}

export function PlayerCardOgImage({ card, fotoUrl, escudoUrl, width = 420 }: Props) {
  const { player, ventana, crudos, atributos, ovr, estado } = card
  const enFormacion = estado === 'en_formacion'

  const w = width
  const h = playerCardShieldHeight(w)
  const s = w / 270
  const shield = playerCardShieldPath(w, h)

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: w,
        height: h,
        opacity: enFormacion ? 0.72 : 1,
      }}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="og-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={PALETTE.bg1} />
            <stop offset="50%" stopColor={PALETTE.bg2} />
            <stop offset="100%" stopColor={PALETTE.bg3} />
          </linearGradient>
          <linearGradient id="og-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c79a3e" />
            <stop offset="50%" stopColor="#e8c878" />
            <stop offset="100%" stopColor="#fff3d0" />
          </linearGradient>
        </defs>
        <path d={shield} fill="url(#og-grad)" />
        <rect x="0" y={h * 0.54} width={w} height={h * 0.46} fill={PALETTE.bg3} opacity={0.5} />
        <path d={shield} fill="none" stroke="url(#og-gold)" strokeWidth={3.5 * s} />
      </svg>

      {/* Foto */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          left: w * 0.28,
          top: h * 0.03,
          width: w * 0.7,
          height: h * 0.5,
          overflow: 'hidden',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fotoUrl}
          alt=""
          width={Math.round(w * 0.65)}
          height={Math.round(h * 0.42)}
          style={{
            objectFit: 'contain',
          }}
        />
      </div>

      {/* OVR · posición · escudo */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          top: h * 0.1,
          left: w * 0.07,
        }}
      >
        <div
          style={{
            fontFamily: PLAYER_CARD_DISPLAY_FONT_OG,
            fontWeight: 700,
            fontSize: 44 * s,
            color: PALETTE.num,
            lineHeight: 0.9,
          }}
        >
          {ovr ?? '–'}
        </div>
        <div
          style={{
            fontSize: 11 * s,
            fontWeight: 700,
            color: PALETTE.muted,
            letterSpacing: '0.25em',
            marginTop: 3 * s,
          }}
        >
          OVR
        </div>
        <div
          style={{
            marginTop: 6 * s,
            padding: `${2 * s}px ${10 * s}px`,
            border: '1px solid rgba(61,230,140,0.35)',
            background: 'rgba(61,230,140,0.14)',
            borderRadius: 6 * s,
            fontFamily: PLAYER_CARD_DISPLAY_FONT_OG,
            fontWeight: 700,
            fontSize: 14 * s,
            color: PALETTE.text,
          }}
        >
          {player.posicion}
        </div>
        <div
          style={{
            marginTop: 6 * s,
            marginBottom: 6 * s,
            width: 26 * s,
            height: 1,
            background: `${PALETTE.muted}44`,
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={escudoUrl}
          alt=""
          width={28 * s}
          height={28 * s}
          style={{ objectFit: 'contain' }}
        />
        {player.equipo ? (
          <div
            style={{
              marginTop: 4 * s,
              maxWidth: 72 * s,
              fontSize: 9 * s,
              fontWeight: 700,
              color: PALETTE.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              textAlign: 'center',
            }}
          >
            {player.equipo}
          </div>
        ) : null}
      </div>

      {/* Nombre + premio */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          top: h * 0.515,
          left: 0,
          right: 0,
          paddingLeft: 16 * s,
          paddingRight: 16 * s,
        }}
      >
        {player.premio ? (
          <div
            style={{
              fontSize: 10 * s,
              fontWeight: 700,
              color: PALETTE.num,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              marginBottom: 2 * s,
            }}
          >
            ◆ {player.premio} ◆
          </div>
        ) : null}
        <div
          style={{
            fontFamily: PLAYER_CARD_DISPLAY_FONT_OG,
            fontWeight: 700,
            fontSize: 22 * s,
            color: PALETTE.text,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}
        >
          {player.nombreCorto}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: h * 0.595,
          left: w * 0.12,
          right: w * 0.12,
          height: 1.5 * s,
          background: `linear-gradient(90deg, transparent, ${PALETTE.num}55, transparent)`,
        }}
      />

      {/* Stats 2 columnas */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          top: h * 0.625,
          left: w * 0.12,
          right: w * 0.12,
        }}
      >
        {[0, 1].map((col) => (
          <div
            key={col}
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              alignItems: 'center',
              paddingLeft: col === 1 ? 8 * s : 0,
              paddingRight: col === 0 ? 8 * s : 0,
              borderLeft: col === 1 ? `1px solid ${PALETTE.muted}33` : undefined,
            }}
          >
            {STAT_PAIRS.map((pair) => {
              const key = pair[col]
              const value = atributos[key]
              const hot = value !== null && value >= PLAYER_CARD_HOT_THRESHOLD
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    width: '100%',
                    maxWidth: 72 * s,
                    marginBottom: 4 * s,
                  }}
                >
                  <div
                    style={{
                      fontFamily: PLAYER_CARD_DISPLAY_FONT_OG,
            fontWeight: 700,
                      fontSize: 18 * s,
                      color: hot ? PALETTE.lines : PALETTE.text,
                      minWidth: 22 * s,
                      marginRight: 6 * s,
                    }}
                  >
                    {formatPlayerCardStat(value)}
                  </div>
                  <div
                    style={{
                      fontSize: 10 * s,
                      fontWeight: 700,
                      color: PALETTE.muted,
                      letterSpacing: '0.12em',
                    }}
                  >
                    {STAT_LABELS[key]}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Pie stats */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          top: h * 0.875,
          left: w * 0.1,
          right: w * 0.1,
        }}
      >
        {[
          { label: 'Goles 30d', value: String(crudos.goles) },
          { label: 'Asist 30d', value: String(crudos.asistencias) },
          { label: 'Gol/PJ', value: playerCardGolPorPartido(crudos.goles, ventana.pj) },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
            }}
          >
            <div
              style={{
                fontFamily: PLAYER_CARD_DISPLAY_FONT_OG,
            fontWeight: 700,
                fontSize: 15 * s,
                color: PALETTE.num,
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: 8 * s,
                fontWeight: 700,
                color: PALETTE.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginTop: 2 * s,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          display: 'flex',
          justifyContent: 'center',
          bottom: h * 0.028,
          left: 0,
          right: 0,
          fontSize: 8 * s,
          fontWeight: 700,
          color: PALETTE.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.28em',
        }}
      >
        Fútbol de los Lunes ·{' '}
        <span style={{ color: PALETTE.text, marginLeft: 4 * s }}>LigaLab</span>
      </div>

      {enFormacion ? (
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            left: 16 * s,
            right: 16 * s,
            bottom: 12 * s,
            padding: `${8 * s}px ${12 * s}px`,
            borderRadius: 8 * s,
            border: '1px solid #22382e',
            background: 'rgba(18,33,27,0.95)',
            color: PALETTE.lines,
            fontSize: 11 * s,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {ventana.pj === 0
            ? `Faltan ${card.partidosFaltantes} partidos para tu primera carta completa`
            : card.partidosFaltantes === 1
              ? 'Falta 1 partido para tu primera carta completa'
              : `Faltan ${card.partidosFaltantes} partidos para tu primera carta completa`}
        </div>
      ) : null}
    </div>
  )
}
