export type DatabaseEnvironment = Readonly<
  Record<string, string | undefined>
>

const SUPABASE_POOLER_SUFFIX = '.pooler.supabase.com'
const SUPABASE_DIRECT_PREFIX = 'db.'
const SUPABASE_DIRECT_SUFFIX = '.supabase.co'

function requirePostgresUrl(name: string, value: string | undefined): URL {
  if (!value?.trim()) {
    throw new Error(`${name} is required`)
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL`)
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(`${name} must use the postgresql protocol`)
  }

  if (!parsed.hostname) {
    throw new Error(`${name} must include a hostname`)
  }

  return parsed
}

function isSupabasePooler(url: URL): boolean {
  return url.hostname.endsWith(SUPABASE_POOLER_SUFFIX)
}

function isSupabaseDirect(url: URL): boolean {
  return (
    url.hostname.startsWith(SUPABASE_DIRECT_PREFIX) &&
    url.hostname.endsWith(SUPABASE_DIRECT_SUFFIX)
  )
}

function assertSupabaseCredentials(name: string, url: URL): void {
  if (!url.username.startsWith('postgres')) {
    throw new Error(`${name} must use a Supabase postgres username`)
  }

  if (!url.password) {
    throw new Error(`${name} must include the database password`)
  }

  if (url.pathname !== '/postgres') {
    throw new Error(`${name} must connect to the postgres database`)
  }
}

function assertSupabaseTransactionUrl(name: string, url: URL): void {
  if (!isSupabasePooler(url) || url.port !== '6543') {
    throw new Error(
      `${name} must use Supavisor Transaction Mode on port 6543`,
    )
  }

  assertSupabaseCredentials(name, url)

  if (url.searchParams.get('pgbouncer') !== 'true') {
    throw new Error(`${name} must include pgbouncer=true`)
  }

  if (url.searchParams.get('connection_limit') !== '1') {
    throw new Error(`${name} must include connection_limit=1`)
  }
}

function assertSessionOrDirectUrl(name: string, url: URL): void {
  if (isSupabasePooler(url)) {
    assertSupabaseCredentials(name, url)

    if (url.searchParams.get('pgbouncer') === 'true') {
      throw new Error(`${name} must not use Supavisor Transaction Mode`)
    }

    if (url.port !== '5432') {
      throw new Error(`${name} must use Supavisor Session Mode on port 5432`)
    }

    return
  }

  if (isSupabaseDirect(url)) {
    assertSupabaseCredentials(name, url)

    if (url.port && url.port !== '5432') {
      throw new Error(`${name} direct connections must use port 5432`)
    }
  }
}

export function getRuntimeDatabaseUrl(
  env: DatabaseEnvironment = process.env,
): string {
  const value = env.DATABASE_URL
  const url = requirePostgresUrl('DATABASE_URL', value)

  if (env.VERCEL === '1' && !isSupabasePooler(url)) {
    throw new Error(
      'DATABASE_URL must use Supavisor Transaction Mode in Vercel',
    )
  }

  if (isSupabasePooler(url)) {
    assertSupabaseTransactionUrl('DATABASE_URL', url)
  }

  return value as string
}

export function requireDirectDatabaseUrl(
  env: DatabaseEnvironment = process.env,
): string {
  const value = env.DIRECT_URL
  const url = requirePostgresUrl('DIRECT_URL', value)

  assertSessionOrDirectUrl('DIRECT_URL', url)

  return value as string
}

const MUTABLE_DB_COMMANDS = new Set(['push', 'execute', 'seed'])

export function prismaCommandRequiresDirectUrl(
  argv: readonly string[],
): boolean {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (token === 'migrate') {
      return true
    }

    if (token === 'db' && MUTABLE_DB_COMMANDS.has(argv[index + 1] ?? '')) {
      return true
    }
  }

  return false
}

export function getPrismaCliDatabaseUrl(
  env: DatabaseEnvironment = process.env,
  argv: readonly string[] = process.argv.slice(2),
): string {
  if (env.DIRECT_URL?.trim()) {
    return requireDirectDatabaseUrl(env)
  }

  if (prismaCommandRequiresDirectUrl(argv)) {
    throw new Error(
      'DIRECT_URL is required for Prisma migrate and mutable db commands',
    )
  }

  return getRuntimeDatabaseUrl(env)
}
