import { CrudService } from '../../core/http/CrudService.js'
import { AppError } from '../../core/errors/AppError.js'

// Admins manage every project; teachers only those of their own linked schools.
export class ProjectService extends CrudService {
  constructor(repository, definition, users, uploads) {
    super(repository, definition)
    this.users = users
    this.uploads = uploads
  }

  // Returns the set of school IDs a teacher is bound to, or null for admins (unrestricted).
  // The schools are read from the database, not the JWT, so changes apply immediately.
  async scopeOf(actor) {
    if (actor.role === 'ADMIN') return null
    const user = await this.users.findById(actor.userId)
    const ids = [...new Set([user?.schoolId, ...(user?.schools ?? []).map(school => school.id)].filter(Boolean))]
    if (!ids.length) throw new AppError(403, 'Vincule-se a uma escola para acessar projetos.')
    return ids
  }

  assertSameSchool(scope, schoolId) {
    if (scope !== null && !scope.includes(schoolId)) {
      throw new AppError(403, 'Você só pode acessar projetos da sua própria escola.')
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
    this.assertSameSchool(await this.scopeOf(actor), data.schoolId)
    const payload = this.uploads ? await this.uploads.normalizeMediaFields(data) : data
    // A coluna description e NOT NULL; sem descricao informada, grava vazio em vez de falhar (500).
    return this.create({ ...payload, description: payload.description ?? '' })
  }

  async updateAs(actor, id, data) {
    const scope = await this.scopeOf(actor)
    this.assertSameSchool(scope, (await this.get(id)).schoolId)
    if (data.schoolId !== undefined) this.assertSameSchool(scope, data.schoolId)
    const payload = this.uploads ? await this.uploads.normalizeMediaFields(data) : data
    return this.repository.update(id, payload)
  }

  async deleteAs(actor, id) {
    const scope = await this.scopeOf(actor)
    this.assertSameSchool(scope, (await this.get(id)).schoolId)
    return this.repository.delete(id)
  }
}
