import {
  Anton,
  Barlow_Condensed,
  Caveat,
  IBM_Plex_Mono,
  Inter,
  Manrope,
  Oswald,
  Playfair_Display,
} from 'next/font/google'

export const anton = Anton({
  variable: '--font-anton',
  subsets: ['latin'],
  weight: '400',
})

export const barlowCondensed = Barlow_Condensed({
  variable: '--font-barlow-condensed',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
})

export const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export const oswald = Oswald({
  variable: '--font-oswald',
  subsets: ['latin'],
})

export const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
})

export const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: '400',
})

export const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
})

export const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
})
