import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'public', 'icons', 'icon.svg')
const editionAssetsDir = join(
  root,
  'apps',
  'mobile',
  'editions',
  'liga-invierno-kelme-puerto-varas-2026',
  'assets',
)

mkdirSync(editionAssetsDir, { recursive: true })

const svg = await sharp(svgPath)

await svg.clone().resize(1024, 1024).png().toFile(join(editionAssetsDir, 'icon.png'))
await svg
  .clone()
  .resize(1024, 1024)
  .flatten({ background: '#CD212A' })
  .png()
  .toFile(join(editionAssetsDir, 'splash.png'))
await svg.clone().resize(1024, 1024).png().toFile(join(editionAssetsDir, 'adaptive-icon.png'))

console.log('Generated edition assets in', editionAssetsDir)
