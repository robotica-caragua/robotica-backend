import Fastify from "fastify"
import cookie from "@fastify/cookie"
import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import jwt from "@fastify/jwt"
import rateLimit from "@fastify/rate-limit"
import { createContainer } from "./container.js"
import { errorHandler } from "./core/errors/error-handler.js"
import { registerCrudRoutes } from "./core/http/registerCrudRoutes.js"
import { authRoutes } from "./modules/auth/routes.js"
import { userRoutes } from "./modules/users/routes.js"

export async function buildApp({ db, config, overrides, logger = false }) {
  const app = Fastify({ logger, routerOptions: { ignoreTrailingSlash: true } })
  await app.register(cors, {
    origin: config.WEB_ORIGIN ?? true,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
  await app.register(helmet)
  await app.register(cookie)
  await app.register(jwt, { secret: config.JWT_ACCESS_SECRET })
  app.setErrorHandler(errorHandler)
  app.decorateRequest("authUser", null)
  const container = createContainer({ db, config, jwt: app.jwt, overrides })
  app.get("/status", async () => ({ status: "ok", message: "API  online" }))
  // Login/password endpoints get a per-IP limit; no token or password is logged.
  app.addHook("onRoute", (route) => {
    if (route.method === "POST" && route.url.startsWith("/auth/")) {
      route.config = {
        ...route.config,
        rateLimit: { max: 30, timeWindow: "1 minute" },
      }
    }
  })
  await app.register(rateLimit, {
    global: false,
    max: 30,
    timeWindow: "1 minute",
  })
  authRoutes(app, container.auth, container.policy)
  userRoutes(app, container.controllers.users, container.policy)
  const admin = [
    container.policy.authenticate,
    container.policy.completed,
    container.policy.role("ADMIN"),
  ]
  registerCrudRoutes(app, "/schools", container.controllers.schools, admin)
  app.get("/public/schools", container.controllers.schools.list)
  // These resources were public in joao; preserve their existing HTTP access.
  registerCrudRoutes(app, "/categories", container.controllers.categories)
  registerCrudRoutes(app, "/tutorials", container.controllers.tutorials)
  registerCrudRoutes(app, "/projects", container.controllers.projects, [
    container.policy.authenticate,
    container.policy.completed,
  ])
  app.addHook("onClose", async () => {
    await db.$disconnect?.()
  })
  await app.ready()
  return app
}
