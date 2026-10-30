import { CrudController } from '../../core/http/CrudController.js'

export class UserController extends CrudController {
  school = async (request) => ({ message: 'Escola encontrada com sucesso.', school: await this.service.school(this.id(request)) })
}
