import { CrudService } from '../../core/http/CrudService.js'
import { AppError } from '../../core/errors/AppError.js'

// Admins manage every tutorial; teachers only those of their own school.
export class TutorialService extends CrudService {
  constructor(repository, definition, users) { super(repository, definition); this.users = users }

  async assertCanManage(actor, schoolId) {
    if (actor.role === 'ADMIN') return
    const user = await this.users.findById(actor.userId)
    if (!user?.schoolId || user.schoolId !== schoolId) {
      throw new AppError(403, 'Você só pode gerenciar tutoriais da sua própria escola.')
    }
  }

  async createAs(actor, data) {
    await this.assertCanManage(actor, data.schoolId)
    return this.create(data)
  }

  async updateAs(actor, id, data) {
    const current = await this.get(id)
    await this.assertCanManage(actor, current.schoolId)
    if (data.schoolId !== undefined) await this.assertCanManage(actor, data.schoolId)
    return this.repository.update(id, data)
  }

  async deleteAs(actor, id) {
    const current = await this.get(id)
    await this.assertCanManage(actor, current.schoolId)
    return this.repository.delete(id)
  }
}
