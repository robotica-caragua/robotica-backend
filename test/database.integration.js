import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createDatabase } from '../src/core/database/prisma.js'
import { buildApp } from '../src/app.js'

// Use a dedicated migrated database. Never infer a production URL from .env.
test('Prisma/MariaDB: authentication, relations, constraints and token transactions', {
  skip: !process.env.TEST_DATABASE_URL && 'Defina TEST_DATABASE_URL para um banco de testes com migrations aplicadas.',
}, async () => {
  const config = { DATABASE_URL: process.env.TEST_DATABASE_URL, NODE_ENV: 'test',
    JWT_ACCESS_SECRET: 'integration-test-only-secret-at-least-32-characters',
    JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN_DAYS: 1, APP_BASE_URL: 'http://frontend.example' }
  const db = await createDatabase(config)
  const mail = []
  const app = await buildApp({ db, config, overrides: { mailer: { send: async (_email, link) => mail.push(link) } } })
  const suffix = randomUUID()
  const ids = { users: [], school: null, category: null, tutorial: null, project: null }
  const request = async (method, url, payload, headers = {}) => {
    const response = await app.inject({ method, url, payload, headers })
    return { status: response.statusCode, body: response.json(), headers: response.headers }
  }
  try {
    const admin = await request('POST', '/auth/register', { name: 'Test admin', email: `${suffix}@test.example`, password: 'integration-password', role: 'ADMIN' })
    assert.equal(admin.status, 201)
    ids.users.push(admin.body.user.id)
    const headers = { authorization: `Bearer ${admin.body.accessToken}` }
    const school = await request('POST', '/schools', { name: `Test ${suffix}` }, headers)
    assert.equal(school.status, 201)
    ids.school = school.body.school.id
    const invalid = await request('POST', '/users', { name: 'Invalid FK', email: `invalid-${suffix}@test.example`, password: 'integration-password', schoolId: 2147483647 }, headers)
    assert.equal(invalid.status, 400)
    const category = await request('POST', '/categories', { name: `Test ${suffix}` })
    assert.equal(category.status, 201)
    ids.category = category.body.category.id
    const tutorial = await request('POST', '/tutorials', { title: 'Test robot', description: 'Test', categoryId: ids.category,
      schoolId: ids.school, difficulty: 'EASY', materialsNeeded: ['Motor'] })
    assert.equal(tutorial.status, 201)
    ids.tutorial = tutorial.body.tutorial.id
    assert.deepEqual(tutorial.body.tutorial.materialsNeeded, ['Motor'])
    assert.equal((await request('PUT', `/tutorials/${ids.tutorial}`, { title: 'Updated' })).body.tutorial.title, 'Updated')
    assert.equal((await request('DELETE', `/categories/${ids.category}`)).status, 400)
    const project = await request('POST', '/projects', { name: 'Test project', schoolId: ids.school }, headers)
    assert.equal(project.status, 201)
    ids.project = project.body.project.id
    const cookie = admin.headers['set-cookie'].split(';')[0]
    const refreshed = await request('POST', '/auth/refresh', undefined, { cookie })
    assert.equal(refreshed.status, 200)
    assert.equal((await request('POST', '/auth/refresh', undefined, { cookie })).status, 401)
    await request('POST', '/auth/forgot-password', { email: `${suffix}@test.example` })
    const token = new URL(mail[0]).searchParams.get('token')
    assert.equal((await request('POST', '/auth/reset-password', { token, password: 'changed-password' })).status, 200)
    assert.equal((await request('POST', '/auth/reset-password', { token, password: 'changed-again-password' })).status, 400)
    assert.equal((await request('POST', '/auth/refresh', undefined, { cookie: refreshed.headers['set-cookie'].split(';')[0] })).status, 401)
    assert.equal((await request('POST', '/auth/login', { email: `${suffix}@test.example`, password: 'changed-password' })).status, 200)
  } finally {
    // Delete only this test's own records, in FK order.
    if (ids.tutorial) await db.tutorial.deleteMany({ where: { id: ids.tutorial } })
    if (ids.project) await db.project.deleteMany({ where: { id: ids.project } })
    if (ids.category) await db.category.deleteMany({ where: { id: ids.category } })
    if (ids.users.length) await db.user.deleteMany({ where: { id: { in: ids.users } } })
    if (ids.school) await db.school.deleteMany({ where: { id: ids.school } })
    await app.close()
  }
})
