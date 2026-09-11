import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'public', 'branding', 'kelme-cup-shield.png')
const outDir = join(root, 'apps', 'mobile', 'editions', 'kelme-cup-los-lagos-2026', 'assets')

mkdirSync(outDir, { recursive: true })

const image = sharp(source)
await image.clone().resize(1024, 1024, { fit: 'contain', background: '#1A7AE8' }).png().toFile(join(outDir, 'icon.png'))
await image.clone().resize(1024, 1024, { fit: 'contain', background: '#1A7AE8' }).flatten({ background: '#1A7AE8' }).png().toFile(join(outDir, 'splash.png'))
await image.clone().resize(1024, 1024, { fit: 'contain', background: '#1A7AE8' }).png().toFile(join(outDir, 'adaptive-icon.png'))

console.log('Generated Kelme Cup edition assets in', outDir)
