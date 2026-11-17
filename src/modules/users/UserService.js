import { CrudService } from '../../core/http/CrudService.js'
import { publicUserSelect } from './UserRepository.js'
import { AppError } from '../../core/errors/AppError.js'

export class UserService extends CrudService {
  constructor(repository, definition, passwords) { super(repository, definition); this.passwords = passwords }
  public(record) { return Object.fromEntries(Object.keys(publicUserSelect).map(key => [key, record[key]])) }
  async list({ status } = {}) {
    const records = await this.repository.findAll(status ? { approvalStatus: status } : undefined)
    if (!records.length) throw new AppError(404, this.definition.messages.empty)
    return records.map(record => this.public(record))
  }
  async get(id) {
    const record = await super.get(id)
    const { school } = await this.repository.findSchool(id)
    return { ...this.public(record), school }
  }
  async create(data) {
    const completed = data.role === 'ADMIN' || Boolean(data.schoolId)
    return this.public(await this.repository.create({ ...data, password: await this.passwords.hash(data.password),
      onboardingStatus: completed ? 'COMPLETED' : 'PENDING', onboardingCompletedAt: completed ? new Date() : null,
      approvalStatus: 'APPROVED' }))
  }
  async update(id, data) {
    const update = { ...data }
    if (data.password) update.password = await this.passwords.hash(data.password)
    return this.public(await super.update(id, update))
  }
  async setApproval(id, approvalStatus) {
    const record = await super.get(id)
    if (record.role !== 'TEACHER') throw new AppError(400, 'Apenas professores passam por aprovação.')
    return this.public(await this.repository.update(id, { approvalStatus }))
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
