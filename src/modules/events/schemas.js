import { z } from 'zod'

const requiredString = (message) => z.string().trim().min(1, message)

const urlDeDocumentoValida = (value) => {
  if (!value) return true
  const compacta = value.replace(/[\s\u0000-\u001f]/g, '')
  const scheme = compacta.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase()
  if (!scheme || scheme === 'http' || scheme === 'https') return true
  return scheme === 'data' && /^data:application\/pdf[;,]/i.test(compacta)
}

const documentUrl = z
  .string()
  .trim()
  .optional()
  .refine(urlDeDocumentoValida, 'URL de documento inválida.')

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
        url: documentUrl,
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
