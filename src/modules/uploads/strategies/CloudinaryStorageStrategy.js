import { createHash } from 'node:crypto'
import { ImageStorageStrategy } from './ImageStorageStrategy.js'
import { AppError } from '../../../core/errors/AppError.js'

export class CloudinaryStorageStrategy extends ImageStorageStrategy {
  constructor(config, fetchImpl = fetch) {
    super()
    Object.assign(this, { config, fetchImpl })
  }

  async upload({ dataUrl }) {
    const {
      CLOUDINARY_CLOUD_NAME: cloudName,
      CLOUDINARY_API_KEY: apiKey,
      CLOUDINARY_API_SECRET: apiSecret,
      CLOUDINARY_FOLDER: folder = 'robotica',
    } = this.config

    if (!cloudName || !apiKey || !apiSecret) {
      throw new AppError(503, 'Credenciais do Cloudinary ausentes.')
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const trimmedFolder = folder.trim()
    const toSign = trimmedFolder
      ? `folder=${trimmedFolder}&timestamp=${timestamp}${apiSecret}`
      : `timestamp=${timestamp}${apiSecret}`
    const signature = createHash('sha1').update(toSign).digest('hex')

    const body = new URLSearchParams({
      file: dataUrl,
      api_key: apiKey,
      timestamp: String(timestamp),
      signature,
      ...(trimmedFolder ? { folder: trimmedFolder } : {}),
    })

    let response
    try {
      response = await this.fetchImpl(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
        { method: 'POST', body },
      )
    } catch {
      throw new AppError(502, 'Falha ao conectar ao serviço de armazenamento de imagens.')
    }

    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.secure_url) {
      throw new AppError(502, 'Falha ao enviar imagem para o Cloudinary.')
    }

    return payload.secure_url
  }
}
