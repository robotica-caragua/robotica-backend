import { z } from 'zod'
const requiredString = (message) => z.string().trim().min(1, message)

export const createAnnouncementSchema = z.object({
  title: requiredString('O campo title é obrigatório.').max(150, 'O título deve ter no máximo 150 caracteres.'),
  message: requiredString('O campo message é obrigatório.').max(2000, 'A mensagem deve ter no máximo 2000 caracteres.'),
})

export const updateAnnouncementSchema = createAnnouncementSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualização.')
