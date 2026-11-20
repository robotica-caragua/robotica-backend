import { z } from 'zod'
const requiredString = (message) => z.string().trim().min(1, message)

const imageField = z.string().trim().min(1, 'A imagem não pode estar vazia.')

export const createProjectSchema = z.object({
  name: requiredString('O campo name é obrigatório.'),
  description: z.string().trim().optional(),
  schoolId: z.number().int().positive('O campo schoolId deve ser um número inteiro positivo.'),
  imageUrl: imageField.nullable().optional(),
  images: z.array(imageField).max(10, 'Informe no máximo 10 imagens.').optional(),
})

export const updateProjectSchema = createProjectSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualização.')
