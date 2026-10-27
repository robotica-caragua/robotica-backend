import { CrudService } from '../../core/http/CrudService.js'
import { publicUserSelect } from './UserRepository.js'
import { AppError } from '../../core/errors/AppError.js'

export class UserService extends CrudService {
  constructor(repository, definition, passwords) { super(repository, definition); this.passwords = passwords }
  public(record) { return Object.fromEntries(Object.keys(publicUserSelect).map(key => [key, record[key]])) }
  async list() { return (await super.list()).map(record => this.public(record)) }
  async get(id) { return this.public(await super.get(id)) }
  async create(data) {
    const completed = data.role === 'ADMIN' || Boolean(data.schoolId)
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
    if (!record.schoolId) throw new AppError(404, 'Escola do usuário não encontrada.')
    if (!record.school) throw new AppError(404, 'Escola não encontrada.')
    return record.school
  }
}
