import { z } from 'zod'
const requiredString = (message) => z.string().trim().min(1, message)

export const createProjectSchema = z.object({
  name: requiredString('O campo name é obrigatório.'),
  description: z.string().trim().optional(),
  media: z.array(requiredString('O campo media deve conter apenas links válidos.'))
    .max(20, 'O campo media aceita no máximo 20 itens.').default([]),
  students: z.array(requiredString('O campo students deve conter apenas nomes válidos.'))
    .min(1, 'Informe ao menos um aluno participante em students.'),
  schoolId: z.number().int().positive('O campo schoolId deve ser um número inteiro positivo.').optional(),
})

export const updateProjectSchema = createProjectSchema
  .partial()
  .extend({ media: createProjectSchema.shape.media.unwrap().optional() })
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualização.')
