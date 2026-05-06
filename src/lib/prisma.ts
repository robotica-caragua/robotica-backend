import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/prisma/client'

function getEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Faltando variável de ambiente: ${name}`)
  }

  return value
}

const adapter = new PrismaMariaDb({
  host: getEnv('DATABASE_HOST'),
  port: Number(getEnv('DATABASE_PORT')),
  user: getEnv('DATABASE_USER'),
  password: getEnv('DATABASE_PASSWORD'),
  database: getEnv('DATABASE_NAME'),
  connectionLimit: 5,
})

export const prisma = new PrismaClient({ adapter })
