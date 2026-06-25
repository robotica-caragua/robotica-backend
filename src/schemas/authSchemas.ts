import { z } from 'zod'
import { UserRole } from '../generated/prisma/enums.js'

const requiredString = (message: string) => z.string().trim().min(1, message)

const roleSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.nativeEnum(UserRole, { error: 'O campo role é inválido.' }),
)

export const registerSchema = z.object({
  name: requiredString('O campo name é obrigatório.'),
  email: z.email('O campo email é inválido.').transform((email) => email.toLowerCase()),
  password: requiredString('O campo password deve ter ao menos 8 caracteres.').min(
    8,
    'O campo password deve ter ao menos 8 caracteres.',
  ),
  role: roleSchema.optional(),
  schoolId: z.number().int().positive('O campo schoolId é inválido.').optional(),
})

export const loginSchema = z.object({
  email: z.email('O campo email é inválido.').transform((email) => email.toLowerCase()),
  password: requiredString('O campo password é obrigatório.'),
})

export type RegisterData = z.infer<typeof registerSchema>
export type LoginData = z.infer<typeof loginSchema>
