import { z } from 'zod'

const requiredString = (message) => z.string().trim().min(1, message)

export const createEventSchema = z.object({
  title: requiredString('O campo title é obrigatório.'),
  type: z.string().trim().optional().default('torneio'),
  description: z.string().trim().optional().default(''),
  date: requiredString('O campo date é obrigatório.'),
  time: z.string().trim().optional().default(''),
  location: requiredString('O campo location é obrigatório.'),
  registration: z.string().trim().optional().default('abertas'),
  status: z.string().trim().optional().default('agendado'),
  agenda: z
    .array(
      z.object({
        horario: z.string().trim(),
        titulo: z.string().trim()
      })
    )
    .optional()
    .nullable(),
  documents: z
    .array(
      z.object({
        nome: z.string().trim(),
        url: z.string().trim().optional(),
        tamanho: z.string().trim().optional()
      })
    )
    .optional()
    .nullable(),
  schoolId: z.number().int().positive().optional().nullable()
})

export const updateEventSchema = createEventSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualização.')
