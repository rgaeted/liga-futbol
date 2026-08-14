import { nativeBundleIdPreview } from '@/lib/mobile-edition-slug'

export type EditionScaffoldConfig = {
  slug: string
  displayName: string
  shortName: string
  organizationSlug: string
  seasonId: string
  primaryColor: string
  secondaryColor: string
  apiBaseUrl: string
}

export type ScaffoldFs = {
  exists: (path: string) => boolean | Promise<boolean>
  mkdir: (path: string, options?: { recursive?: boolean }) => void | Promise<void>
  copyDir: (from: string, to: string) => void | Promise<void>
  writeFile: (path: string, content: string) => void | Promise<void>
  readFile: (path: string) => string | Promise<string>
}

export function editionFolderName(slug: string): string {
  return slug
}

export function slugToCamel(slug: string): string {
  return slug
    .split('-')
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('')
}

export function buildEditionConfigSource(config: EditionScaffoldConfig): string {
  const bundleId = nativeBundleIdPreview(config.organizationSlug, config.slug)
  const urlScheme = config.slug.replace(/-/g, '')
  const shortName = config.shortName.replace(/'/g, "\\'")
  const displayName = config.displayName.replace(/'/g, "\\'")

  return `// seasonId: ${config.seasonId} organizationSlug: ${config.organizationSlug}
const edition = {
  key: '${config.slug}',
  slug: '${config.slug}',
  displayName: '${displayName}',
  shortName: '${shortName}',
  urlScheme: '${urlScheme}',
  iosBundleIdentifier: '${bundleId}',
  androidPackage: '${bundleId}',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '${config.apiBaseUrl}',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  primaryColor: '${config.primaryColor}',
  secondaryColor: '${config.secondaryColor}',
  assetsDir: 'editions/${config.slug}',
} as const

export default edition
`
}

export function editionIndexPatch(existingSource: string, slug: string): string {
  const camel = slugToCamel(slug)
  if (
    existingSource.includes(`import ${camel} from`) ||
    existingSource.includes(`[${camel}.key]: ${camel}`)
  ) {
    return existingSource
  }

  const importLine = `import ${camel} from '../../editions/${slug}/edition.config'\n`
  const lastImportIndex = existingSource.lastIndexOf('\nimport ')
  const insertAt = lastImportIndex === -1 ? 0 : existingSource.indexOf('\n', lastImportIndex) + 1
  const withImport =
    existingSource.slice(0, insertAt) + importLine + existingSource.slice(insertAt)

  const editionsMarker = 'const EDITIONS: Record<string, EditionConfig> = {'
  const markerIndex = withImport.indexOf(editionsMarker)
  if (markerIndex === -1) {
    throw new Error('No se encontró el objeto EDITIONS en edition.ts')
  }

  const openBraceIndex = withImport.indexOf('{', markerIndex)
  const entry = `\n  [${camel}.key]: ${camel},`
  return withImport.slice(0, openBraceIndex + 1) + entry + withImport.slice(openBraceIndex + 1)
}

const PILOT_ASSETS = 'apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026/assets'

export async function applyMobileEditionScaffold(args: {
  slug: string
  force: boolean
  repoRoot: string
  config: EditionScaffoldConfig
  files: ScaffoldFs
}): Promise<void> {
  const editionDir = `${args.repoRoot}/apps/mobile/editions/${args.slug}`
  const assetsDir = `${editionDir}/assets`
  const editionConfigPath = `${editionDir}/edition.config.ts`
  const editionIndexPath = `${args.repoRoot}/apps/mobile/src/lib/edition.ts`

  if ((await args.files.exists(editionDir)) && !args.force) {
    throw new Error('La carpeta de edición ya existe')
  }

  await args.files.mkdir(editionDir, { recursive: true })

  const pilotAssets = `${args.repoRoot}/${PILOT_ASSETS}`
  if (await args.files.exists(pilotAssets)) {
    await args.files.copyDir(pilotAssets, assetsDir)
  } else {
    await args.files.mkdir(assetsDir, { recursive: true })
  }

  await args.files.writeFile(editionConfigPath, buildEditionConfigSource(args.config))

  const editionIndexSource = await args.files.readFile(editionIndexPath)
  const patched = editionIndexPatch(editionIndexSource, args.slug)
  await args.files.writeFile(editionIndexPath, patched)
}
