import { z } from 'zod'
import { requiredString } from './genericUtils'

export const createTutorialSchema = z.object({
  title: requiredString('O campo `title` é obrigatório.'),
  description: z.string(),

  categoryId: z.number('O campo `category` é obrigatório.'),

  difficulty: z.enum(
    ['EASY', 'MEDIUM', 'HARD'],
    'Dificuldade inválida. Insira entre `EASY`, `MEDIUM`, `HARD`',
  ),

  schoolId: z.number('O campo `schoolId` é obrigatório.'),

  materialsNeeded: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'O material não pode estar vazio')
        .max(80, 'O material deve ter no máximo 80 caracteres'),
    )
    .min(1, 'Informe pelo menos um material')
    .max(50, 'Informe no máximo 50 materiais'),

  tutorialUrl: z.url('URL de tutorial inválido.').optional(),
})

export const updateTutorialSchema = createTutorialSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualização.')

export type CreateTutorialData = z.infer<typeof createTutorialSchema>
export type UpdateTutorialData = z.infer<typeof updateTutorialSchema>
