import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { createContainer } from './container.js'
import { errorHandler } from './core/errors/error-handler.js'
import { registerCrudRoutes } from './core/http/registerCrudRoutes.js'
import { registerSwagger } from './core/http/swagger.js'
import { authRoutes } from './modules/auth/routes.js'
import { userRoutes } from './modules/users/routes.js'
import { uploadRoutes } from './modules/uploads/routes.js'

export async function buildApp({ db, config, overrides, logger = false }) {
  const app = Fastify({
    logger,
    bodyLimit: 50 * 1024 * 1024,
    routerOptions: { ignoreTrailingSlash: true },
  })
  // Só origens explícitas: com credentials, o navegador recusa "Access-Control-Allow-Origin: *".
  // Sem CORS_ORIGINS configurado, nenhuma origem externa é autorizada.
  await app.register(cors, {
    origin: config.CORS_ORIGINS ?? config.WEB_ORIGIN ?? [],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
  await registerSwagger(app)
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", ...app.swaggerCSP.script],
        'style-src': ["'self'", 'https:', ...app.swaggerCSP.style],
      },
    },
  })
  await app.register(cookie)
  await app.register(jwt, { secret: config.JWT_ACCESS_SECRET })
  app.setErrorHandler(errorHandler)
  app.decorateRequest('authUser', null)
  const container = createContainer({ db, config, jwt: app.jwt, overrides })
  app.get('/status', async () => ({ status: 'ok', message: 'API  online' }))
  // Login/password endpoints get a per-IP limit; no token or password is logged.
  app.addHook('onRoute', (route) => {
    if (route.method === 'POST' && route.url.startsWith('/auth/')) {
      route.config = {
        ...route.config,
        rateLimit: { max: 30, timeWindow: '1 minute' },
      }
    }
  })
  await app.register(rateLimit, {
    global: false,
    max: 30,
    timeWindow: '1 minute',
  })
  authRoutes(app, container.auth, container.policy)
  userRoutes(app, container.controllers.users, container.policy)
  uploadRoutes(app, container.uploads, container.policy)
  const admin = [
    container.policy.authenticate,
    container.policy.completed,
    container.policy.role('ADMIN'),
  ]
  registerCrudRoutes(app, '/schools', container.controllers.schools, admin)
  app.get('/public/schools', container.controllers.schools.list)
  // Reads stay public; writes require auth. Categories: ADMIN only. Tutorials: ADMIN or same-school teacher.
  const session = [container.policy.authenticate, container.policy.completed]
  registerCrudRoutes(app, '/categories', container.controllers.categories, [], [
    ...session,
    container.policy.role('ADMIN'),
  ])
  registerCrudRoutes(app, '/tutorials', container.controllers.tutorials, [], [
    ...session,
    container.policy.role('ADMIN', 'TEACHER'),
  ])
  registerCrudRoutes(app, '/projects', container.controllers.projects, [
    container.policy.authenticate,
    container.policy.completed,
  ])
  app.get('/public/projects', container.controllers.projects.listPublic)
  app.get('/public/projects/:id', container.controllers.projects.getPublic)
  registerCrudRoutes(app, '/events', container.controllers.events, [], admin)
  // Avisos: qualquer usuário autenticado lê; somente ADMIN cria/edita/remove.
  registerCrudRoutes(app, '/announcements', container.controllers.announcements, session, [
    container.policy.role('ADMIN'),
  ])
  app.addHook('onClose', async () => {
    await db.$disconnect?.()
  })
  await app.ready()
  return app
}
