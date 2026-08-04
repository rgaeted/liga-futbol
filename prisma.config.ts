import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { getPrismaCliDatabaseUrl } from './src/lib/database-env'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: getPrismaCliDatabaseUrl(process.env, process.argv.slice(2)),
  },
})
