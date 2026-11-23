import { CrudService } from '../../core/http/CrudService.js'
import { publicUserSelect } from './UserRepository.js'
import { AppError } from '../../core/errors/AppError.js'

export class UserService extends CrudService {
  constructor(repository, definition, passwords) { super(repository, definition); this.passwords = passwords }
  public(record) {
    const base = Object.fromEntries(Object.keys(publicUserSelect).map(key => [key, record[key] ?? null]))
    return {
      ...base,
      schools: Array.isArray(record.schools) ? record.schools : [],
      perfil: record.role === 'ADMIN' ? 'ADMINISTRADOR' : 'PROFESSOR',
      permissaoAdministrador: record.role === 'ADMIN',
    }
  }
  async list() { return (await super.list()).map(record => this.public(record)) }
  async get(id) { return this.public(await super.get(id)) }
  async create(data) {
    const completed = data.role === 'ADMIN' || Boolean(data.schoolId) || Boolean(data.schoolIds?.length)
    return this.public(await this.repository.create({ ...data, password: await this.passwords.hash(data.password),
      onboardingStatus: completed ? 'COMPLETED' : 'PENDING', onboardingCompletedAt: completed ? new Date() : null }))
  }
  async update(id, data) {
    const update = { ...data }
    if (data.password) update.password = await this.passwords.hash(data.password)
    return this.public(await super.update(id, update))
  }
  async delete(id) { return this.public(await super.delete(id)) }
  async school(id) {
    const record = await this.repository.findSchool(id)
    if (!record) throw new AppError(404, 'Usuário não encontrado.')
    const schools = Array.isArray(record.schools) ? [...record.schools] : []
    if (record.school && !schools.some(s => s.id === record.school.id)) schools.unshift(record.school)
    const primary = record.school || schools[0] || null
    if (!record.schoolId && !primary) throw new AppError(404, 'Escola do usuário não encontrada.')
    if (!primary) throw new AppError(404, 'Escola não encontrada.')
    return { primary, schools }
  }
}
