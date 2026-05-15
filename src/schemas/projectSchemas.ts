import { z } from 'zod'
import { requiredString } from './genericUtils'

export const createProjectSchema = z.object({
  name: requiredString('O campo name é obrigatório.'),
  description: z.string().trim().optional(),
  schoolId: z.number().positive('O campo schoolId deve ser um número inteiro positivo.').optional(),
})

export const updateProjectSchema = createProjectSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualização.')

export type CreateProjectData = z.infer<typeof createProjectSchema>
export type UpdateProjectData = z.infer<typeof updateProjectSchema>

