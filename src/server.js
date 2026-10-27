import { loadConfig } from './config/env.js'
import { createDatabase } from './core/database/prisma.js'
import { buildApp } from './app.js'

const config = loadConfig()
const db = await createDatabase(config)
const app = await buildApp({ db, config, logger: {
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
} })
try {
  await db.$connect()
  await app.listen({ port: config.PORT, host: config.HOST })
} catch (error) {
  app.log.error(error)
  await app.close()
  process.exitCode = 1
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => { await app.close() })
}
