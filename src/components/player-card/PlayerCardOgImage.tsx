import type { PlayerCardDto } from '@/lib/player-card-query'
import {
  PLAYER_CARD_DISPLAY_FONT_OG,
  PLAYER_CARD_PALETTE as PALETTE,
  PLAYER_CARD_SHIELD_CLIP_POLYGON,
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
  const { player, estado, badgesRecientes } = card
  const enFormacion = estado === 'en_formacion'
  const fotoEsRecorte = player.fotoEsRecorte
  const badgeCount = badgesRecientes?.length ?? 0

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

      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          clipPath: PLAYER_CARD_SHIELD_CLIP_POLYGON,
        }}
      >
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            left: w * 0.1,
            right: w * 0.1,
            top: h * 0.015,
            bottom: h * 0.42,
            overflow: 'hidden',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotoUrl}
            alt=""
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: fotoEsRecorte ? 'contain' : 'cover',
              objectPosition: fotoEsRecorte ? 'center bottom' : 'center 10%',
            }}
          />
          {!fotoEsRecorte ? (
            <div
              style={{
                position: 'absolute',
                display: 'flex',
                left: 0,
                right: 0,
                bottom: 0,
                height: h * 0.16,
                background:
                  'linear-gradient(to bottom, rgba(11,18,16,0), rgba(11,18,16,0.96))',
              }}
            />
          ) : null}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          top: h * 0.12,
          left: w * 0.07,
        }}
      >
        <div
          style={{
            padding: `${2 * s}px ${10 * s}px`,
            border: '1px solid rgba(61,230,140,0.35)',
            background: 'rgba(61,230,140,0.14)',
            borderRadius: 6 * s,
            fontFamily: PLAYER_CARD_DISPLAY_FONT_OG,
            fontWeight: 700,
            fontSize: 16 * s,
            color: PALETTE.text,
          }}
        >
          {player.posicion}
        </div>
        <div style={{ marginTop: 6 * s, marginBottom: 6 * s, width: 26 * s, height: 1, background: `${PALETTE.muted}44` }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={escudoUrl} alt="" width={32 * s} height={32 * s} style={{ objectFit: 'contain' }} />
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

      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          top: h * 0.64,
          left: w * 0.12,
          right: w * 0.12,
        }}
      >
        <div
          style={{
            fontSize: 9 * s,
            fontWeight: 700,
            color: PALETTE.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
          }}
        >
          Insignias
        </div>
        <div
          style={{
            marginTop: 8 * s,
            fontFamily: PLAYER_CARD_DISPLAY_FONT_OG,
            fontWeight: 700,
            fontSize: 20 * s,
            color: badgeCount > 0 ? PALETTE.num : `${PALETTE.muted}cc`,
          }}
        >
          {badgeCount > 0 ? `${badgeCount} ganadas` : 'Aún sin insignias'}
        </div>
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
          {card.partidosFaltantes === 1
            ? 'Falta 1 partido para tu primera carta completa'
            : `Faltan ${card.partidosFaltantes} partidos para tu primera carta completa`}
        </div>
      ) : null}
    </div>
  )
}
