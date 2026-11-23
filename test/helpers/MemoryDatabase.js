// Test double for Prisma's persistence boundary. Production always uses Prisma.
export class MemoryDatabase {
  constructor() {
    this.tables = {}
    for (const name of ['user', 'school', 'roboticsGroup', 'authSession', 'passwordResetToken', 'category', 'tutorial', 'project', 'event', 'announcement']) {
      const rows = this.tables[name] = []
      const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => {
        if (value && typeof value === 'object' && 'gt' in value) return row[key] > value.gt
        if (value && typeof value === 'object' && Array.isArray(value.in)) return value.in.includes(row[key])
        return row[key] === value
      })
      const linkedSchools = row => {
        const ids = [...new Set([...(row.schoolIds || []), ...(row.schoolId ? [row.schoolId] : [])])]
        return ids.map(id => structuredClone(this.tables.school.find(school => school.id === id))).filter(Boolean)
      }
      // Emula as escritas da relação N:N (connect/set) como uma lista de ids na própria linha.
      const applyRelations = (row, data) => {
        const { schools, ...rest } = data
        if (schools?.set) row.schoolIds = schools.set.map(item => item.id)
        if (schools?.connect) row.schoolIds = [...new Set([...(row.schoolIds || []), ...schools.connect.map(item => item.id)])]
        Object.assign(row, rest)
      }
      const project = (row, { select, include } = {}) => {
        if (!row) return null
        const result = structuredClone(row)
        if (include?.user) result.user = structuredClone(this.tables.user.find(user => user.id === row.userId))
        if (include?.user?.include?.schools && result.user) result.user.schools = linkedSchools(result.user)
        if (include?.schools || select?.schools) result.schools = linkedSchools(row)
        if (select?.school) result.school = structuredClone(this.tables.school.find(school => school.id === row.schoolId) || null)
        if (select?.category) result.category = structuredClone(this.tables.category.find(category => category.id === row.categoryId) || null)
        return select ? Object.fromEntries(Object.keys(select).map(key => [key, result[key]])) : result
      }
      this[name] = {
        create: async ({ data, ...options }) => {
          if (name === 'user' && rows.some(row => row.email === data.email)) throw Object.assign(new Error('duplicate'), { code: 'P2002' })
          const defaults = name === 'user' ? { role: 'TEACHER', authProvider: 'LOCAL', googleId: null,
            matricula: null, onboardingStatus: 'PENDING', onboardingCompletedAt: null, schoolId: null, roboticsGroupId: null }
            : (name === 'project' || name === 'tutorial') ? { imageUrl: null, images: null } : {}
          const row = { id: Math.max(0, ...rows.map(row => row.id)) + 1, createdAt: new Date(), updatedAt: new Date(),
            revokedAt: null, usedAt: null, ...defaults }
          applyRelations(row, data)
          rows.push(row)
          return project(row, options)
        },
        findMany: async (options = {}) => rows.filter(row => matches(row, options.where)).map(row => project(row, options)),
        findUnique: async (options) => project(rows.find(row => matches(row, options.where)), options),
        findFirst: async (options) => project(rows.find(row => matches(row, options.where)), options),
        update: async ({ where, data, ...options }) => {
          const row = rows.find(row => matches(row, where))
          if (!row) throw Object.assign(new Error('missing'), { code: 'P2025' })
          applyRelations(row, data)
          row.updatedAt = new Date()
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
