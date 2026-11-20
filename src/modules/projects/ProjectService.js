import { CrudService } from '../../core/http/CrudService.js'
import { AppError } from '../../core/errors/AppError.js'

// Admins manage every project; teachers only those of their own school.
export class ProjectService extends CrudService {
  constructor(repository, definition, users) { super(repository, definition); this.users = users }

  // Returns the school a teacher is bound to, or null for admins (unrestricted).
  // The school is read from the database, not the JWT, so changes apply immediately.
  async scopeOf(actor) {
    if (actor.role === 'ADMIN') return null
    const user = await this.users.findById(actor.userId)
    if (!user?.schoolId) throw new AppError(403, 'Vincule-se a uma escola para acessar projetos.')
    return user.schoolId
  }

  assertSameSchool(scope, schoolId) {
    if (scope !== null && scope !== schoolId) {
      throw new AppError(403, 'Você só pode acessar projetos da sua própria escola.')
    }
  }

  async listAs(actor) {
    const scope = await this.scopeOf(actor)
    const records = await this.repository.findAll(scope === null ? undefined : { schoolId: scope })
    if (!records.length) throw new AppError(404, this.definition.messages.empty)
    return records
  }

  async getAs(actor, id) {
    const scope = await this.scopeOf(actor)
    const record = await this.get(id)
    this.assertSameSchool(scope, record.schoolId)
    return record
  }

  async createAs(actor, data) {
    this.assertSameSchool(await this.scopeOf(actor), data.schoolId)
    return this.create(data)
  }

  async updateAs(actor, id, data) {
    const scope = await this.scopeOf(actor)
    this.assertSameSchool(scope, (await this.get(id)).schoolId)
    if (data.schoolId !== undefined) this.assertSameSchool(scope, data.schoolId)
    return this.repository.update(id, data)
  }

  async deleteAs(actor, id) {
    const scope = await this.scopeOf(actor)
    this.assertSameSchool(scope, (await this.get(id)).schoolId)
    return this.repository.delete(id)
  }
}
