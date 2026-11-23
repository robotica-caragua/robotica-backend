import { CrudController } from '../../core/http/CrudController.js'
import { parse } from '../../core/http/validation.js'

export class AnnouncementController extends CrudController {
  create = async (request, reply) => {
    const record = await this.service.createAs(request.authUser, parse(this.definition.createSchema, request.body))
    return reply.code(201).send({ message: this.definition.messages.create, [this.definition.key]: record })
  }
}
