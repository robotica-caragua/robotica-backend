import { AppError } from '../errors/AppError.js'

export class CrudService {
  constructor(repository, definition) { Object.assign(this, { repository, definition }) }
  async list() {
    const records = await this.repository.findAll()
    if (!records.length) throw new AppError(404, this.definition.messages.empty)
    return records
  }
  async get(id) {
    const record = await this.repository.findById(id)
    if (!record) throw new AppError(404, this.definition.messages.notFound)
    return record
  }
  create(data) { return this.repository.create(data) }
  async update(id, data) { await this.get(id); return this.repository.update(id, data) }
  async delete(id) { await this.get(id); return this.repository.delete(id) }
}
