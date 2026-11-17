import { CrudController } from '../../core/http/CrudController.js'
import { parse } from '../../core/http/validation.js'
import { listUsersQuerySchema, updateApprovalSchema, updateProfileSchema } from './schemas.js'

export class UserController extends CrudController {
  list = async (request) => ({ message: this.definition.messages.list,
    [this.definition.plural]: await this.service.list(parse(listUsersQuerySchema, request.query)) })
  approval = async (request) => ({ message: 'Status de aprovação atualizado com sucesso!',
    user: await this.service.setApproval(this.id(request), parse(updateApprovalSchema, request.body).status) })
  updateProfile = async (request) => ({ message: 'Perfil atualizado com sucesso!',
    user: await this.service.update(request.authUser.userId, parse(updateProfileSchema, request.body)) })
  school = async (request) => ({ message: 'Escola encontrada com sucesso.', school: await this.service.school(this.id(request)) })
}
