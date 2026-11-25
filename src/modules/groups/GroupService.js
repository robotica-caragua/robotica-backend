import { CrudService } from '../../core/http/CrudService.js'
import { AppError } from '../../core/errors/AppError.js'

export class GroupService extends CrudService {
  constructor(repository, definition, users) {
    super(repository, definition)
    this.users = users
  }

  async scopeOf(actor) {
    if (actor.role === 'ADMIN') return null
    const user = await this.users.findById(actor.userId)
    const ids = [...new Set([user?.schoolId, ...(user?.schools ?? []).map((school) => school.id)].filter(Boolean))]
    if (!ids.length) throw new AppError(403, 'Vincule-se a uma escola para acessar equipes.')
    return ids
  }

  assertSameSchool(scope, schoolId) {
    if (scope !== null && (!schoolId || !scope.includes(schoolId))) {
      throw new AppError(403, 'Você só pode gerenciar equipes das escolas às quais está vinculado.')
    }
  }

  async listAs(actor) {
    const scope = await this.scopeOf(actor)
    const where = scope === null ? undefined : scope.length === 1 ? { schoolId: scope[0] } : { schoolId: { in: scope } }
    const records = await this.repository.findAll(where)
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
    const scope = await this.scopeOf(actor)
    const payload = { ...data }
    if (scope !== null && (payload.schoolId === undefined || payload.schoolId === null)) {
      payload.schoolId = scope[0]
    }
    this.assertSameSchool(scope, payload.schoolId)
    return this.create(payload)
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
