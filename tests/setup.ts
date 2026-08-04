// Prisma client initializes at import time; unit tests need a valid placeholder URL.
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@127.0.0.1:5432/postgres'
