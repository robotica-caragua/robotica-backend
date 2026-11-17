import { PrismaRepository } from '../../core/database/PrismaRepository.js'

export const publicUserSelect = { id: true, name: true, email: true, role: true, schoolId: true, approvalStatus: true, createdAt: true, updatedAt: true }

export class UserRepository extends PrismaRepository {
  constructor(db) { super(db.user); this.db = db }
  findAll(where) { return this.model.findMany({ where, orderBy: { id: 'asc' } }) }
  findByEmail(email) { return this.model.findUnique({ where: { email } }) }
  findByGoogleId(googleId) { return this.model.findUnique({ where: { googleId } }) }
  findSchool(id) { return this.model.findUnique({ where: { id }, select: { schoolId: true, school: true } }) }
}
