import { z } from 'zod'

const requiredString = (message: string) => z.string().trim().min(1, message)

export const createSchoolSchema = z.object({
  name: requiredString('O campo name é obrigatório.'),
  address: z.string().trim().optional(),
})

export const updateSchoolSchema = createSchoolSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualização.')

export type CreateSchoolData = z.infer<typeof createSchoolSchema>
export type UpdateSchoolData = z.infer<typeof updateSchoolSchema>
