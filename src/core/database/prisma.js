import { PrismaMariaDb } from '@prisma/adapter-mariadb'

export async function createDatabase(config) {
  // Lazy import keeps HTTP/service tests independent of a generated client.
  const { PrismaClient } = await import('@prisma/client')
  const url = new URL(config.DATABASE_URL)
  if (!['mysql:', 'mariadb:'].includes(url.protocol)) throw new Error('DATABASE_URL deve usar MySQL/MariaDB.')
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: 5,
  })
  return new PrismaClient({ adapter })
}
