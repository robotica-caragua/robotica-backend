import { CrudService } from '../../core/http/CrudService.js'
import { AppError } from '../../core/errors/AppError.js'

export class ProjectService extends CrudService {
  constructor(repository, definition, users) { super(repository, definition); this.users = users }

  async create(data, actor) {
    const owner = await this.users.findById(actor.userId)
    const schoolId = data.schoolId ?? owner?.schoolId
    if (!schoolId) throw new AppError(400, 'Informe a escola do projeto em schoolId.')
    return this.repository.create({ ...data, schoolId, teacherId: actor.userId })
  }

  async update(id, data, actor) {
    await this.authorize(id, actor)
    return this.repository.update(id, data)
  }

  async delete(id, actor) {
    await this.authorize(id, actor)
    return this.repository.delete(id)
  }

  // Only the teacher who created the project or an admin may change or remove it.
  async authorize(id, actor) {
    const project = await this.get(id)
    if (actor.role !== 'ADMIN' && project.teacherId !== actor.userId) {
      throw new AppError(403, 'Apenas o professor que criou o projeto ou um administrador pode alterá-lo.')
    }
  }
}
