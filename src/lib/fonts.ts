import {
  Anton,
  Barlow_Condensed,
  Caveat,
  IBM_Plex_Mono,
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
  weight: ['400', '600', '700'],
})

export const oswald = Oswald({
  variable: '--font-oswald',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

export const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['700', '800', '900'],
})

export const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})
