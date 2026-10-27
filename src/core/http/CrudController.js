import { parse, parseId } from './validation.js'

export class CrudController {
  constructor(service, definition) { Object.assign(this, { service, definition }) }
  id(request) { return parseId(request.params.id, this.definition.label) }
  list = async () => ({ message: this.definition.messages.list, [this.definition.plural]: await this.service.list() })
  get = async (request) => ({ message: this.definition.messages.get, [this.definition.key]: await this.service.get(this.id(request)) })
  create = async (request, reply) => {
    const record = await this.service.create(parse(this.definition.createSchema, request.body))
    return reply.code(201).send({ message: this.definition.messages.create, [this.definition.key]: record })
  }
  update = async (request) => {
    const id = this.id(request)
    const record = await this.service.update(id, parse(this.definition.updateSchema, request.body))
    return { message: this.definition.messages.update, [this.definition.key]: record }
  }
  delete = async (request) => ({ message: this.definition.messages.delete, [this.definition.key]: await this.service.delete(this.id(request)) })
}
