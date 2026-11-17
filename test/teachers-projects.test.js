import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../src/app.js'
import { MemoryDatabase } from './helpers/MemoryDatabase.js'

const config = { NODE_ENV: 'test', JWT_ACCESS_SECRET: 'test-only-secret-with-at-least-32-characters',
  JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN_DAYS: 30, GOOGLE_CLIENT_ID: 'test-client',
  GOOGLE_ALLOWED_DOMAIN: 'school.example', APP_BASE_URL: 'http://frontend.example' }
const bearer = (token) => ({ authorization: `Bearer ${token}` })

async function fixture(t) {
  const db = new MemoryDatabase()
  const app = await buildApp({ db, config, overrides: { mailer: { send: async () => {} } } })
  t.after(() => app.close())
  const request = async (method, url, payload, headers = {}) => {
    const response = await app.inject({ method, url, payload, headers })
    return { status: response.statusCode, body: response.json() }
  }
  const register = (overrides) => request('POST', '/auth/register', {
    name: 'Professor', email: 'teacher@school.example', password: 'original-password', ...overrides,
  })
  const login = async (email) => bearer((await request('POST', '/auth/login', { email, password: 'original-password' })).body.accessToken)
  const admin = bearer((await register({ role: 'ADMIN', email: 'admin@school.example' })).body.accessToken)
  const school = (await request('POST', '/schools', { name: 'Escola' }, admin)).body.school
  // Teachers register publicly (status PENDING) and are approved by the admin afterwards.
  const teacher = async (email) => {
    const created = (await register({ email, schoolId: school.id })).body.user
    return { id: created.id, login: () => login(email) }
  }
  return { request, admin, school, teacher }
}

test('admin lists teachers, filters by status and sees the linked school in the details', async t => {
  const { request, admin, school, teacher } = await fixture(t)
  const first = await teacher('first@school.example')
  const second = await teacher('second@school.example')
  assert.equal((await request('GET', '/users', undefined, admin)).body.users.length, 3)
  assert.equal((await request('GET', '/users?status=PENDING', undefined, admin)).body.users.length, 2)
  assert.equal((await request('GET', '/users?status=Indeferido', undefined, admin)).status, 404)
  assert.equal((await request('GET', '/users?status=qualquer', undefined, admin)).status, 400)

  const approved = await request('PATCH', `/users/${first.id}/approval`, { status: 'Deferido' }, admin)
  assert.equal(approved.status, 200)
  assert.equal(approved.body.user.approvalStatus, 'APPROVED')
  assert.equal((await request('PATCH', `/users/${second.id}/approval`, { status: 'INDEFERIDO' }, admin)).body.user.approvalStatus, 'REJECTED')
  assert.deepEqual((await request('GET', '/users?status=Deferido', undefined, admin)).body.users.map(user => user.role), ['ADMIN', 'TEACHER'])
  assert.deepEqual((await request('GET', '/users?status=indeferido', undefined, admin)).body.users.map(user => user.id), [second.id])

  const details = await request('GET', `/users/${first.id}`, undefined, admin)
  assert.equal(details.body.user.school.name, school.name)
  assert.ok(!('password' in details.body.user))
  assert.equal((await request('GET', '/users/999', undefined, admin)).status, 404)
})

test('approval route is restricted to admins, validates input and only targets teachers', async t => {
  const { request, admin, teacher } = await fixture(t)
  const first = await teacher('first@school.example')
  const headers = await first.login()
  assert.equal((await request('PATCH', `/users/${first.id}/approval`, { status: 'APPROVED' })).status, 401)
  assert.equal((await request('PATCH', `/users/${first.id}/approval`, { status: 'APPROVED' }, headers)).status, 403)
  assert.equal((await request('PATCH', `/users/${first.id}/approval`, { status: 'x' }, admin)).status, 400)
  assert.equal((await request('PATCH', '/users/999/approval', { status: 'APPROVED' }, admin)).status, 404)
  assert.equal((await request('PATCH', '/users/1/approval', { status: 'APPROVED' }, admin)).status, 400)
})

test('teachers only reach protected content after approval and lose it when rejected', async t => {
  const { request, admin, teacher } = await fixture(t)
  const first = await teacher('first@school.example')
  assert.equal((await request('GET', '/projects', undefined, await first.login())).status, 403)
  await request('PATCH', `/users/${first.id}/approval`, { status: 'APPROVED' }, admin)
  assert.equal((await request('GET', '/projects', undefined, await first.login())).status, 404)
  await request('PATCH', `/users/${first.id}/approval`, { status: 'REJECTED' }, admin)
  assert.equal((await request('GET', '/projects', undefined, await first.login())).status, 403)
})

test('teacher updates the basic profile and admin deletes an account', async t => {
  const { request, admin, teacher } = await fixture(t)
  const first = await teacher('first@school.example')
  await teacher('second@school.example')
  const headers = await first.login()
  const updated = await request('PUT', '/users/me', { name: 'Nome Novo' }, headers)
  assert.equal(updated.status, 200)
  assert.equal(updated.body.user.name, 'Nome Novo')
  assert.ok(!('password' in updated.body.user))
  assert.equal((await request('PUT', '/users/me', {}, headers)).status, 400)
  assert.equal((await request('PUT', '/users/me', { role: 'ADMIN' }, headers)).status, 400)
  assert.equal((await request('PUT', '/users/me', { name: 'Sem token' })).status, 401)

  assert.equal((await request('DELETE', `/users/${first.id}`, undefined, headers)).status, 403)
  assert.equal((await request('DELETE', `/users/${first.id}`, undefined, admin)).status, 200)
  assert.equal((await request('GET', `/users/${first.id}`, undefined, admin)).status, 404)
  assert.equal((await request('DELETE', `/users/${first.id}`, undefined, admin)).status, 404)
})

test('projects record owner, media and students, and enforce owner/admin rules', async t => {
  const { request, admin, school, teacher } = await fixture(t)
  const owner = await teacher('owner@school.example')
  const other = await teacher('other@school.example')
  for (const user of [owner, other]) await request('PATCH', `/users/${user.id}/approval`, { status: 'APPROVED' }, admin)
  const ownerHeaders = await owner.login()
  const otherHeaders = await other.login()

  const payload = { name: 'Robô', description: 'Descrição', media: ['https://example.com/a.png'], students: ['Ana', 'Bia'] }
  assert.equal((await request('POST', '/projects', payload)).status, 401)
  assert.equal((await request('POST', '/projects', { ...payload, students: [] }, ownerHeaders)).status, 400)
  assert.equal((await request('POST', '/projects', { name: 'Robô' }, ownerHeaders)).status, 400)
  const created = await request('POST', '/projects', payload, ownerHeaders)
  assert.equal(created.status, 201)
  const project = created.body.project
  assert.equal(project.teacherId, owner.id)
  assert.equal(project.schoolId, school.id)
  assert.deepEqual(project.students, ['Ana', 'Bia'])
  assert.deepEqual(project.media, ['https://example.com/a.png'])

  assert.equal((await request('GET', '/projects', undefined, otherHeaders)).body.projects.length, 1)
  assert.equal((await request('GET', `/projects/${project.id}`, undefined, otherHeaders)).body.project.name, 'Robô')
  assert.equal((await request('GET', '/projects/999', undefined, otherHeaders)).status, 404)

  assert.equal((await request('PUT', `/projects/${project.id}`, { name: 'Hack' }, otherHeaders)).status, 403)
  assert.equal((await request('DELETE', `/projects/${project.id}`, undefined, otherHeaders)).status, 403)
  const updated = await request('PUT', `/projects/${project.id}`, { name: 'Robô 2' }, ownerHeaders)
  assert.equal(updated.body.project.name, 'Robô 2')
  assert.deepEqual(updated.body.project.media, ['https://example.com/a.png'])
  assert.deepEqual(updated.body.project.students, ['Ana', 'Bia'])
  assert.equal((await request('PUT', `/projects/${project.id}`, { students: ['Caio'] }, admin)).body.project.students[0], 'Caio')
  assert.equal((await request('PUT', `/projects/${project.id}`, {}, ownerHeaders)).status, 400)

  assert.equal((await request('DELETE', `/projects/${project.id}`, undefined, ownerHeaders)).status, 200)
  const again = (await request('POST', '/projects', payload, ownerHeaders)).body.project
  assert.equal((await request('DELETE', `/projects/${again.id}`, undefined, admin)).status, 200)
  assert.equal((await request('GET', '/projects', undefined, ownerHeaders)).status, 404)
})

test('admin without a school must inform schoolId when creating a project', async t => {
  const { request, school } = await fixture(t)
  const loose = await request('POST', '/auth/register', { name: 'Admin', email: 'loose@school.example', password: 'original-password', role: 'ADMIN' })
  const headers = bearer(loose.body.accessToken)
  const payload = { name: 'Robô', students: ['Ana'] }
  assert.equal((await request('POST', '/projects', payload, headers)).status, 400)
  assert.equal((await request('POST', '/projects', { ...payload, schoolId: school.id }, headers)).status, 201)
})
