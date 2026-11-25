import { CrudService } from '../../core/http/CrudService.js'
import { AppError } from '../../core/errors/AppError.js'

// Admins manage every tutorial; teachers only those of their own linked schools.
export class TutorialService extends CrudService {
  constructor(repository, definition, users, uploads) {
    super(repository, definition)
    this.users = users
    this.uploads = uploads
  }

  async assertCanManage(actor, schoolId) {
    if (actor.role === 'ADMIN') return
    const user = await this.users.findById(actor.userId)
    const linked = new Set([user?.schoolId, ...(user?.schools ?? []).map(school => school.id)].filter(Boolean))
    if (!linked.has(schoolId)) {
      throw new AppError(403, 'Você só pode gerenciar conteúdos das escolas às quais está vinculado.')
    }
  }

  async createAs(actor, data) {
    await this.assertCanManage(actor, data.schoolId)
    const payload = this.uploads ? await this.uploads.normalizeMediaFields(data) : data
    return this.create(payload)
  }

  async updateAs(actor, id, data) {
    const current = await this.get(id)
    await this.assertCanManage(actor, current.schoolId)
    if (data.schoolId !== undefined) await this.assertCanManage(actor, data.schoolId)
    const payload = this.uploads ? await this.uploads.normalizeMediaFields(data) : data
    return this.repository.update(id, payload)
  }

  async deleteAs(actor, id) {
    const current = await this.get(id)
    await this.assertCanManage(actor, current.schoolId)
    return this.repository.delete(id)
  }
}
