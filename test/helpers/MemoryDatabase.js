// Test double for Prisma's persistence boundary. Production always uses Prisma.
export class MemoryDatabase {
  constructor() {
    this.tables = {}
    for (const name of ['user', 'school', 'roboticsGroup', 'authSession', 'passwordResetToken', 'category', 'tutorial', 'project']) {
      const rows = this.tables[name] = []
      const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => {
        if (value && typeof value === 'object' && 'gt' in value) return row[key] > value.gt
        return row[key] === value
      })
      const project = (row, { select, include } = {}) => {
        if (!row) return null
        const result = structuredClone(row)
        if (include?.user) result.user = structuredClone(this.tables.user.find(user => user.id === row.userId))
        if (select?.school) result.school = structuredClone(this.tables.school.find(school => school.id === row.schoolId) || null)
        if (select?.category) result.category = structuredClone(this.tables.category.find(category => category.id === row.categoryId) || null)
        return select ? Object.fromEntries(Object.keys(select).map(key => [key, result[key]])) : result
      }
      this[name] = {
        create: async ({ data, ...options }) => {
          if (name === 'user' && rows.some(row => row.email === data.email)) throw Object.assign(new Error('duplicate'), { code: 'P2002' })
          const defaults = name === 'user' ? { role: 'TEACHER', authProvider: 'LOCAL', googleId: null,
            onboardingStatus: 'PENDING', onboardingCompletedAt: null, schoolId: null, roboticsGroupId: null } : {}
          const row = { id: Math.max(0, ...rows.map(row => row.id)) + 1, createdAt: new Date(), updatedAt: new Date(),
            revokedAt: null, usedAt: null, ...defaults, ...data }
          rows.push(row)
          return project(row, options)
        },
        findMany: async (options = {}) => rows.filter(row => matches(row, options.where)).map(row => project(row, options)),
        findUnique: async (options) => project(rows.find(row => matches(row, options.where)), options),
        findFirst: async (options) => project(rows.find(row => matches(row, options.where)), options),
        update: async ({ where, data, ...options }) => {
          const row = rows.find(row => matches(row, where))
          if (!row) throw Object.assign(new Error('missing'), { code: 'P2025' })
          Object.assign(row, data, { updatedAt: new Date() })
          return project(row, options)
        },
        updateMany: async ({ where, data }) => {
          const selected = rows.filter(row => matches(row, where))
          selected.forEach(row => Object.assign(row, data))
          return { count: selected.length }
        },
        delete: async ({ where, ...options }) => {
          const index = rows.findIndex(row => matches(row, where))
          if (index < 0) throw Object.assign(new Error('missing'), { code: 'P2025' })
          return project(rows.splice(index, 1)[0], options)
        },
      }
    }
  }
  $transaction(action) { return action(this) }
  async $disconnect() {}
}
