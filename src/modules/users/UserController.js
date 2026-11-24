import { CrudController } from '../../core/http/CrudController.js'
import { parse } from '../../core/http/validation.js'
import { AppError } from '../../core/errors/AppError.js'

export class UserController extends CrudController {
  update = async (request) => {
    const id = this.id(request)
    const parsed = parse(this.definition.updateSchema, request.body)
    if (request.authUser?.role !== 'ADMIN') {
      delete parsed.role
      delete parsed.perfil
      delete parsed.permissaoAdministrador
    }
    const record = await this.service.update(id, parsed)
    return { message: this.definition.messages.update, [this.definition.key]: record }
  }
  delete = async (request) => {
    const id = this.id(request)
    if (request.authUser?.userId && Number(request.authUser.userId) === Number(id)) {
      throw new AppError(400, 'Você não pode excluir a sua própria conta.')
    }
    const record = await this.service.delete(id)
    return { message: this.definition.messages.delete, [this.definition.key]: record }
  }
  school = async (request) => {
    const { primary, schools } = await this.service.school(this.id(request))
    return { message: 'Escola encontrada com sucesso.', school: primary, schools }
  }
}
