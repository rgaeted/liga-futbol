import { APP_LOCALE } from '@/lib/locale'
import { PLAYER_CARD_HOT_THRESHOLD } from '@/lib/player-card'
import type { PlayerCardDto } from '@/lib/player-card-query'
import { personInitials } from '@/lib/player-name'
import { BadgeDisco } from '@/components/badges/BadgeDisco'
import { PlayerCardPhoto } from '@/components/player-card/PlayerCardPhoto'

type Props = {
  card: PlayerCardDto
}

const STAT_ROWS = [
  { key: 'TIR' as const, label: 'TIR' },
  { key: 'VIS' as const, label: 'VIS' },
  { key: 'RES' as const, label: 'RES' },
  { key: 'REG' as const, label: 'REG' },
  { key: 'RIT' as const, label: 'RIT' },
  { key: 'FIS' as const, label: 'FÍS' },
]

function formatStatValue(value: number | null): string {
  return value === null ? '–' : String(value)
}

function formationBadgeText(partidosFaltantes: number): string {
  if (partidosFaltantes === 1) {
    return 'Falta 1 partido para tu primera carta completa'
  }
  return `Faltan ${partidosFaltantes} partidos para tu primera carta completa`
}

function golPorPartido(goles: number, pj: number): string {
  if (pj === 0) return '–'
  return (goles / pj).toLocaleString(APP_LOCALE, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function StatRow({
  label,
  value,
}: {
  label: string
  value: number | null
}) {
  const hot = value !== null && value >= PLAYER_CARD_HOT_THRESHOLD
  const barWidth = value ?? 0

  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-[34px] font-[family-name:var(--font-anton)] text-[21px] ${
          hot ? 'text-[#3DE68C]' : 'text-[#EDF2EE]'
        }`}
      >
        {formatStatValue(value)}
      </span>
      <span className="text-[13px] font-bold tracking-[0.15em] text-[#8BA598]">{label}</span>
      <span className="h-1 flex-1 overflow-hidden rounded-sm bg-[#1B2C24]">
        {value !== null ? (
          <span
            className="block h-full bg-gradient-to-r from-[#1FA968] to-[#3DE68C]"
            style={{ width: `${barWidth}%` }}
          />
        ) : null}
      </span>
    </div>
  )
}

export function PlayerCard({ card }: Props) {
  const { player, ventana, crudos, atributos, ovr, estado, partidosFaltantes, badgesRecientes } =
    card
  const enFormacion = estado === 'en_formacion'
  const recentBadges = badgesRecientes?.slice(0, 4) ?? []

  return (
    <div
      className="relative w-[310px] rounded-[22px] p-[2px] shadow-[0_26px_60px_rgba(0,0,0,0.6)]"
      style={{
        background:
          'conic-gradient(from 210deg, #C79A3E, #E8C878, #FFF3D0, #E8C878, #C79A3E)',
      }}
    >
      <div
        className={`relative overflow-hidden rounded-[20px] px-[18px] pb-5 pt-[18px] ${
          enFormacion ? 'grayscale' : ''
        }`}
        style={{
          background: 'linear-gradient(172deg, #14241D 0%, #0C1611 62%, #0A130F 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'repeating-linear-gradient(115deg, transparent 0 26px, rgba(255,255,255,0.014) 26px 27px)',
          }}
        />
        <div
          className="pointer-events-none absolute left-[-30%] top-[-60%] h-[220%] w-[80%] rotate-[18deg]"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
          }}
        />

        <div className="relative flex items-start justify-between">
          <div className="text-center leading-[0.9]">
            <div className="font-[family-name:var(--font-anton)] text-[52px] text-[#E8C878] drop-shadow-[0_2px_16px_rgba(232,200,120,0.3)]">
              {ovr ?? '–'}
            </div>
            <div className="text-xs font-bold tracking-[0.3em] text-[#8BA598]">OVR</div>
            <div className="mt-[5px] inline-block rounded-md border border-[rgba(61,230,140,0.3)] bg-[rgba(61,230,140,0.14)] px-[9px] py-px font-[family-name:var(--font-anton)] text-[15px] tracking-wide text-[#EDF2EE]">
              {player.posicion}
            </div>
          </div>
          <div className="text-right">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={player.escudoUrl}
              alt="Escudo"
              className="h-11 w-11 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
            />
            {player.equipo ? (
              <span className="mt-[3px] block text-[11px] font-bold uppercase tracking-[0.2em] text-[#8BA598]">
                {player.equipo}
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative -mx-1 mt-1.5 flex h-[186px] items-end justify-center">
          <div className="absolute bottom-[14px] h-[150px] w-[150px] rounded-full bg-[radial-gradient(circle,rgba(61,230,140,0.22),transparent_68%)]" />
          <PlayerCardPhoto
            fotoUrl={player.fotoUrl}
            alt={player.nombre}
            initials={personInitials(player.nombreCorto)}
          />
        </div>

        <div className="relative mt-0.5 text-center">
          {player.premio ? (
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E8C878]">
              ◆ {player.premio} ◆
            </span>
          ) : null}
          <b className="block font-[family-name:var(--font-anton)] text-[27px] uppercase leading-none tracking-wide">
            {player.nombreCorto}
          </b>
        </div>

        <div
          className="my-[11px] h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, #C79A3E, transparent)',
          }}
        />

        <div className="relative grid grid-cols-2 gap-x-5 gap-y-1.5">
          {STAT_ROWS.map(({ key, label }) => (
            <StatRow key={key} label={label} value={atributos[key]} />
          ))}
        </div>

        {recentBadges.length > 0 ? (
          <div className="relative mt-3 flex justify-center gap-2">
            {recentBadges.map((badge) => (
              <BadgeDisco
                key={`${badge.iconKey}-${badge.name}`}
                rarity={badge.rarity}
                iconKey={badge.iconKey}
                size="sm"
              />
            ))}
          </div>
        ) : null}

        <div className="relative mt-[13px] flex justify-between">
          <div className="flex-1 text-center">
            <b className="block font-[family-name:var(--font-anton)] text-lg text-[#E8C878]">
              {crudos.goles}
            </b>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8BA598]">
              Goles 30d
            </span>
          </div>
          <div className="flex-1 text-center">
            <b className="block font-[family-name:var(--font-anton)] text-lg text-[#E8C878]">
              {crudos.asistencias}
            </b>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8BA598]">
              Asist 30d
            </span>
          </div>
          <div className="flex-1 text-center">
            <b className="block font-[family-name:var(--font-anton)] text-lg text-[#E8C878]">
              {golPorPartido(crudos.goles, ventana.pj)}
            </b>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8BA598]">
              Gol/PJ
            </span>
          </div>
        </div>

        <div className="relative mt-3 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-[#8BA598]">
          Fútbol de los Lunes · <b className="text-[#EDF2EE]">LigaLab</b>
        </div>
      </div>

      {enFormacion ? (
        <div className="absolute inset-x-3 bottom-3 z-10 rounded-lg border border-[#22382E] bg-[#12211B]/95 px-3 py-2 text-center text-sm font-semibold text-[#3DE68C]">
          {formationBadgeText(partidosFaltantes)}
        </div>
      ) : null}
    </div>
  )
}
