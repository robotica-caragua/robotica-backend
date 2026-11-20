import { readFile } from 'node:fs/promises'
import { AppError } from '../../core/errors/AppError.js'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const DATA_URL_REGEX = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i
const SAFE_FILENAME_REGEX = /^[a-f0-9-]+\.(jpg|png|webp)$/i

function detectImageFormat(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' }
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mimeType: 'image/png', extension: 'png' }
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' }
  }
  return null
}

export class UploadService {
  constructor(storage) {
    this.storage = storage
  }

  async resolveImage(input) {
    const value = String(input).trim()
    if (/^https?:\/\//i.test(value)) {
      if (!URL.canParse(value)) throw new AppError(400, 'URL de imagem inválida.')
      return value
    }

    const match = DATA_URL_REGEX.exec(value)
    if (!match) {
      throw new AppError(400, 'Formato de imagem inválido. Envie PNG, JPG ou WEBP em Base64 (Data URL) ou uma URL válida.')
    }

    const base64 = match[2].replace(/\s+/g, '')
    const buffer = Buffer.from(base64, 'base64')
    if (!buffer.length) throw new AppError(400, 'Imagem vazia ou inválida.')
    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new AppError(400, 'A imagem deve ter no máximo 5MB.')
    }

    const detected = detectImageFormat(buffer)
    if (!detected) {
      throw new AppError(400, 'Arquivo de imagem inválido ou corrompido. Use PNG, JPG ou WEBP.')
    }

    const normalizedDataUrl = `data:${detected.mimeType};base64,${base64}`
    return this.storage.upload({
      dataUrl: normalizedDataUrl,
      buffer,
      mimeType: detected.mimeType,
      extension: detected.extension,
    })
  }

  async uploadMany(inputs) {
    const urls = await Promise.all(inputs.map((item) => this.resolveImage(item)))
    return { imageUrl: urls[0] || null, images: urls }
  }

  async normalizeMediaFields(data) {
    const result = { ...data }
    const hasImages = result.images !== undefined
    const hasImageUrl = result.imageUrl !== undefined

    if (!hasImages && !hasImageUrl) return result

    if (hasImages) {
      if (result.images === null || result.images.length === 0) {
        result.images = []
        if (!hasImageUrl || !result.imageUrl) {
          result.imageUrl = null
        } else {
          result.imageUrl = await this.resolveImage(result.imageUrl)
          result.images = [result.imageUrl]
        }
        return result
      }

      const urls = await Promise.all(result.images.map((item) => this.resolveImage(item)))
      result.images = urls
      if (hasImageUrl && result.imageUrl) {
        result.imageUrl = await this.resolveImage(result.imageUrl)
        if (!result.images.includes(result.imageUrl)) {
          result.images = [result.imageUrl, ...result.images]
        }
      } else {
        result.imageUrl = urls[0] || null
      }
      return result
    }

    if (!result.imageUrl) {
      result.imageUrl = null
      result.images = []
      return result
    }

    const url = await this.resolveImage(result.imageUrl)
    result.imageUrl = url
    result.images = [url]
    return result
  }

  async readLocalFile(filename) {
    if (!SAFE_FILENAME_REGEX.test(filename)) {
      throw new AppError(400, 'Nome de arquivo inválido.')
    }
    try {
      const buffer = await readFile(`.local/uploads/${filename}`)
      const ext = filename.split('.').pop().toLowerCase()
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
      return { buffer, mimeType }
    } catch {
      throw new AppError(404, 'Imagem não encontrada.')
    }
  }
}
