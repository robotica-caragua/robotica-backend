import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { ImageStorageStrategy } from './ImageStorageStrategy.js'

export class LocalStorageStrategy extends ImageStorageStrategy {
  constructor(config) {
    super()
    this.config = config
  }

  async upload({ buffer, extension }) {
    await mkdir('.local/uploads', { recursive: true, mode: 0o700 })
    const filename = `${randomUUID()}.${extension}`
    await writeFile(`.local/uploads/${filename}`, buffer, { mode: 0o600 })
    const port = this.config.PORT || 3333
    return `http://localhost:${port}/uploads/${filename}`
  }
}
