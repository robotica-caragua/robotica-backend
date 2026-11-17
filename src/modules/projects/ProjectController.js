import { CrudController } from '../../core/http/CrudController.js'
import { parse } from '../../core/http/validation.js'

export class ProjectController extends CrudController {
  create = async (request, reply) => {
    const record = await this.service.create(parse(this.definition.createSchema, request.body), request.authUser)
    return reply.code(201).send({ message: this.definition.messages.create, [this.definition.key]: record })
  }
  update = async (request) => {
    const id = this.id(request)
    const record = await this.service.update(id, parse(this.definition.updateSchema, request.body), request.authUser)
    return { message: this.definition.messages.update, [this.definition.key]: record }
  }
  delete = async (request) => ({ message: this.definition.messages.delete,
    [this.definition.key]: await this.service.delete(this.id(request), request.authUser) })
}
