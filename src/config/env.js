import "dotenv/config"
import { z } from "zod"

export function loadConfig(source = process.env) {
  return z
    .object({
      NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
      PORT: z.coerce.number().int().min(1).max(65535).default(3333),
      HOST: z.string().default("0.0.0.0"),
      WEB_ORIGIN: z.url().default("http://localhost:3000"),
      DATABASE_URL: z.url(),
      JWT_ACCESS_SECRET: z.string().min(32),
      JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
      JWT_REFRESH_EXPIRES_IN_DAYS: z.coerce.number().positive().default(30),
      GOOGLE_CLIENT_ID: z.string().optional(),
      GOOGLE_ALLOWED_DOMAIN: z.string().optional(),
      APP_BASE_URL: z.url().default("http://localhost:3000"),
      SMTP_HOST: z.string().optional(),
      SMTP_PORT: z.coerce.number().int().positive().default(587),
      SMTP_USER: z.string().optional(),
      SMTP_PASSWORD: z.string().optional(),
      MAIL_FROM: z.string().default("no-reply@robotica.local"),
    })
    .parse(source)
}
