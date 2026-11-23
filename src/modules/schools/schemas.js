import { z } from "zod"
const requiredString = (message) => z.string().trim().min(1, message)

export const createSchoolSchema = z.object({
  name: requiredString("O campo name é obrigatório."),
  address: z.string().trim().optional(),
  description: z.string().trim().max(5000, "A descrição deve ter no máximo 5000 caracteres.").optional(),
})

export const updateSchoolSchema = createSchoolSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Informe ao menos um campo para atualização.",
  )
