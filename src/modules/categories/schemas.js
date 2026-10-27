import { z } from 'zod'
const requiredString = (message) => z.string().trim().min(1, message)

export const createCategorySchema = z.object({
  name: requiredString('O campo `name` é obrigatório.'),
})

export const updateCategorySchema = createCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualização.')
