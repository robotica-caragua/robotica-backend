import { z } from 'zod'

const imageItemSchema = z
  .string()
  .trim()
  .min(1, 'A imagem não pode estar vazia.')

export const uploadImagesSchema = z
  .object({
    image: imageItemSchema.optional(),
    images: z
      .array(imageItemSchema)
      .min(1, 'Envie pelo menos uma imagem.')
      .max(10, 'Envie no máximo 10 imagens por vez.')
      .optional(),
  })
  .refine((data) => Boolean(data.image) || Boolean(data.images?.length), 'Informe `image` ou `images`.')
