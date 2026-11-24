import { PrismaMariaDb } from '@prisma/adapter-mariadb'

export function resolvePoolConfig(databaseUrl) {
  const url = new URL(databaseUrl)
  if (!['mysql:', 'mariadb:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL deve usar MySQL/MariaDB.')
  }
  const sslParam = (
    url.searchParams.get('ssl') ||
    url.searchParams.get('sslaccept') ||
    url.searchParams.get('ssl-mode') ||
    url.searchParams.get('sslmode') ||
    ''
  ).toLowerCase()
  const useSsl = Boolean(sslParam) && !['false', '0', 'disabled'].includes(sslParam)
  const strictSsl = ['strict', 'verify_identity', 'verify-full'].includes(sslParam)

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: 5,
    allowPublicKeyRetrieval: true,
    ...(useSsl ? { ssl: { rejectUnauthorized: strictSsl } } : {}),
  }
}

export async function createDatabase(config) {
  const { PrismaClient } = await import('@prisma/client')
  const adapter = new PrismaMariaDb(resolvePoolConfig(config.DATABASE_URL))
  return new PrismaClient({ adapter })
}
