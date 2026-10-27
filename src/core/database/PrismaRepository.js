export class PrismaRepository {
  constructor(model, select) { Object.assign(this, { model, select }) }
  findAll() { return this.model.findMany({ orderBy: { id: 'asc' }, select: this.select }) }
  findById(id) { return this.model.findUnique({ where: { id }, select: this.select }) }
  create(data) { return this.model.create({ data, select: this.select }) }
  update(id, data) { return this.model.update({ where: { id }, data, select: this.select }) }
  delete(id) { return this.model.delete({ where: { id }, select: this.select }) }
}
