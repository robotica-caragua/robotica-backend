import 'dotenv/config'
import { z } from 'zod'
import { createDatabase } from '../src/core/database/prisma.js'
import { AdminProvisioner } from '../src/modules/users/AdminProvisioner.js'

const email = z.email().safeParse(process.argv[2]?.trim().toLowerCase())
if (!email.success || process.argv.length !== 3) {
  console.error('Uso: npm run admin:promote -- email@exemplo.com')
  process.exitCode = 1
} else if (!process.env.DATABASE_URL) {
  console.error('Configure DATABASE_URL no .env antes de executar o comando.')
  process.exitCode = 1
} else {
  let db
  try {
    db = await createDatabase({ DATABASE_URL: process.env.DATABASE_URL })
    const user = await new AdminProvisioner(db).promote(email.data)
    console.log(`Conta ${user.email} (ID ${user.id}) promovida a ADMIN. Faça login novamente.`)
  } catch (error) {
    console.error(error.statusCode === 404 ? error.message : 'Não foi possível promover a conta. Verifique a conexão e as migrações do banco.')
    process.exitCode = 1
  } finally {
    await db?.$disconnect()
  }
}
