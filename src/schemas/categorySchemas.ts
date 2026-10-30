import { z } from 'zod'
import { requiredString } from './genericUtils'

export const createCategorySchema = z.object({
  name: requiredString('O campo `name` é obrigatório.'),
})

export const updateCategorySchema = createCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualização.')

export type CreateCategoryData = z.infer<typeof createCategorySchema>
export type UpdateCategoryData = z.infer<typeof updateCategorySchema>
