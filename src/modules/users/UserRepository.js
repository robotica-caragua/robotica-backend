import { PrismaRepository } from '../../core/database/PrismaRepository.js'

export const publicUserSelect = { id: true, name: true, email: true, matricula: true, role: true, schoolId: true, schools: true, createdAt: true, updatedAt: true }

export const userSchoolsInclude = { schools: { select: { id: true, name: true, address: true }, orderBy: { id: 'asc' } } }

export class UserRepository extends PrismaRepository {
  constructor(db) { super(db.user); this.db = db }

  prepare(data, creating) {
    const { schoolIds, ...rest } = data
    delete rest.perfil
    delete rest.permissaoAdministrador
    if (Array.isArray(schoolIds)) {
      const ids = [...new Set(schoolIds)]
      rest.schoolId = ids[0] ?? null
      if (ids.length > 0) {
        rest.schools = creating ? { connect: ids.map(id => ({ id })) } : { set: ids.map(id => ({ id })) }
      } else if (!creating) {
        rest.schools = { set: [] }
      }
    } else if (rest.schoolId) {
      rest.schools = creating ? { connect: [{ id: rest.schoolId }] } : { set: [{ id: rest.schoolId }] }
    } else if (rest.schoolId === null && !creating) {
      rest.schools = { set: [] }
    }
    return rest
  }

  async hydrateSchools(record) {
    if (!record) return record
    const list = Array.isArray(record.schools) ? [...record.schools] : []
    if (record.schoolId && !list.some(s => s.id === record.schoolId)) {
      const primary = await this.db.school?.findUnique?.({
        where: { id: record.schoolId },
        select: { id: true, name: true, address: true }
      })
      if (primary) list.unshift(primary)
    }
    return { ...record, schools: list }
  }

  async findAll() {
    const rows = await this.model.findMany({ orderBy: { id: 'asc' }, include: userSchoolsInclude })
    return Promise.all(rows.map(row => this.hydrateSchools(row)))
  }
  async findById(id) { return this.hydrateSchools(await this.model.findUnique({ where: { id }, include: userSchoolsInclude })) }
  async create(data) { return this.hydrateSchools(await this.model.create({ data: this.prepare(data, true), include: userSchoolsInclude })) }
  async update(id, data) { return this.hydrateSchools(await this.model.update({ where: { id }, data: this.prepare(data, false), include: userSchoolsInclude })) }
  async delete(id) {
    const existing = await this.findById(id)
    if (existing) {
      await this.db.announcement?.updateMany?.({ where: { authorId: id }, data: { authorId: null } })
      await this.model.update({
        where: { id },
        data: { schoolId: null, roboticsGroupId: null, schools: { set: [] } }
      })
    }
    const deleted = await this.model.delete({ where: { id }, include: userSchoolsInclude })
    return existing ? { ...deleted, schools: existing.schools } : this.hydrateSchools(deleted)
  }
  async findByEmail(email) { return this.hydrateSchools(await this.model.findUnique({ where: { email }, include: userSchoolsInclude })) }
  async findByGoogleId(googleId) { return this.hydrateSchools(await this.model.findUnique({ where: { googleId }, include: userSchoolsInclude })) }
  findSchool(id) { return this.model.findUnique({ where: { id }, select: { schoolId: true, school: true, schools: { select: { id: true, name: true, address: true }, orderBy: { id: 'asc' } } } }) }
}
