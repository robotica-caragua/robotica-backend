import { parse } from '../../core/http/validation.js'
import { uploadImagesSchema } from './schemas.js'

export class UploadController {
  constructor(service) {
    this.service = service
  }

  upload = async (request, reply) => {
    const payload = parse(uploadImagesSchema, request.body)
    const list = payload.images?.length ? payload.images : [payload.image]
    const result = await this.service.uploadMany(list)
    return reply.code(201).send({
      message: 'Imagens enviadas com sucesso!',
      imageUrl: result.imageUrl,
      images: result.images,
    })
  }

  serveLocal = async (request, reply) => {
    const { buffer, mimeType } = await this.service.readLocalFile(String(request.params.filename || ''))
    return reply.header('content-type', mimeType).send(buffer)
  }
}
