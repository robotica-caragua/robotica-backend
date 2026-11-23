import { CrudService } from '../../core/http/CrudService.js'

// Avisos da administração: lista vazia não é erro e o autor é registrado na criação.
export class AnnouncementService extends CrudService {
  async list() {
    const records = await this.repository.findAll()
    return records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id - a.id)
  }

  createAs(actor, data) {
    return this.repository.create({ ...data, authorId: actor.userId })
  }
}
