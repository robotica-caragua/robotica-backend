import { z } from 'zod'

const requiredString = (message) => z.string().trim().min(1, message)

export const createGroupSchema = z.object({
  name: requiredString('O campo name é obrigatório.'),
  students: z.string().trim().nullable().optional(),
  grade: z.string().trim().max(191, 'A série deve ter no máximo 191 caracteres.').nullable().optional(),
  schoolId: z.number().int().positive('O campo schoolId deve ser um número inteiro positivo.').nullable().optional(),
})

export const updateGroupSchema = createGroupSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualização.')
