import { z } from 'zod'

const requiredString = (message) => z.string().trim().min(1, message)

export const registerSchema = z.object({
  name: requiredString('O campo name é obrigatório.'),
  email: z.email('O campo email é inválido.').transform((email) => email.toLowerCase()),
  password: requiredString('O campo password deve ter ao menos 8 caracteres.').min(
    8,
    'O campo password deve ter ao menos 8 caracteres.',
  ),
  schoolId: z.number().int().positive('O campo schoolId é inválido.').optional(),
})

export const loginSchema = z.object({
  email: z.email('O campo email é inválido.').transform((email) => email.toLowerCase()),
  password: requiredString('O campo password é obrigatório.'),
})

export const forgotPasswordSchema = z.object({
  email: z.email('O campo email é inválido.').transform((email) => email.toLowerCase()),
})

export const resetPasswordSchema = z.object({
  token: requiredString('O campo token é obrigatório.'),
  password: requiredString('O campo password deve ter ao menos 8 caracteres.').min(
    8,
    'O campo password deve ter ao menos 8 caracteres.',
  ),
})

export const googleLoginSchema = z.object({
  idToken: requiredString('O campo idToken é obrigatório.'),
})

export const completeOnboardingSchema = z
  .object({
    schoolId: z.number().int().positive('O campo schoolId é inválido.').optional(),
    roboticsGroupId: z.number().int().positive('O campo roboticsGroupId é inválido.').optional(),
  })
  .refine(
    (data) => Boolean(data.schoolId) || Boolean(data.roboticsGroupId),
    'Informe schoolId ou roboticsGroupId.',
  )
