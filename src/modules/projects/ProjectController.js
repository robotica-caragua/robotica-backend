import { CrudController } from '../../core/http/CrudController.js'
import { parse } from '../../core/http/validation.js'

export class ProjectController extends CrudController {
  listPublic = async () => ({ message: this.definition.messages.list,
    [this.definition.plural]: await this.service.list() })
  getPublic = async request => ({ message: this.definition.messages.get,
    [this.definition.key]: await this.service.get(this.id(request)) })
  list = async request => ({ message: this.definition.messages.list,
    [this.definition.plural]: await this.service.listAs(request.authUser) })
  get = async request => ({ message: this.definition.messages.get,
    [this.definition.key]: await this.service.getAs(request.authUser, this.id(request)) })
  create = async (request, reply) => {
    const record = await this.service.createAs(request.authUser, parse(this.definition.createSchema, request.body))
    return reply.code(201).send({ message: this.definition.messages.create, [this.definition.key]: record })
  }
  update = async request => {
    const id = this.id(request)
    const record = await this.service.updateAs(request.authUser, id, parse(this.definition.updateSchema, request.body))
    return { message: this.definition.messages.update, [this.definition.key]: record }
  }
  delete = async request => ({ message: this.definition.messages.delete,
    [this.definition.key]: await this.service.deleteAs(request.authUser, this.id(request)) })
}
