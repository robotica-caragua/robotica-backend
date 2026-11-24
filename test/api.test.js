import { AdminProvisioner } from '../src/modules/users/AdminProvisioner.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcrypt'
import { buildApp } from '../src/app.js'
import { MemoryDatabase } from './helpers/MemoryDatabase.js'

const config = { NODE_ENV: 'test', JWT_ACCESS_SECRET: 'test-only-secret-with-at-least-32-characters',
  JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN_DAYS: 30, GOOGLE_CLIENT_ID: 'test-client',
  GOOGLE_ALLOWED_DOMAIN: 'school.example', APP_BASE_URL: 'http://frontend.example' }
async function fixture(t, options = {}) {
  const db = new MemoryDatabase()
  const mail = []
  const app = await buildApp({ db, config, overrides: { mailer: { send: async (email, link) => mail.push({ email, link }) }, ...options } })
  t.after(() => app.close())
  const request = async (method, url, payload, headers = {}) => {
    const response = await app.inject({ method, url, payload, headers })
    return { status: response.statusCode, body: response.json(), headers: response.headers }
  }
  const register = (overrides = {}) => request('POST', '/auth/register', {
    name: 'Professor', email: 'teacher@school.example', password: 'original-password', ...overrides,
  })
  const createAdmin = async (email = 'admin@school.example') => {
    await register({ email })
    await new AdminProvisioner(db).promote(email)
    return request('POST', '/auth/login', { email, password: 'original-password' })
  }
  return { app, db, mail, request, register, createAdmin }
}
const bearer = (token) => ({ authorization: `Bearer ${token}` })
const refreshCookie = (result) => result.headers['set-cookie'].split(';')[0]

test('status, validation and protected endpoints preserve the HTTP contract', async t => {
  const { request, app } = await fixture(t)
  assert.deepEqual((await request('GET', '/status')).body, { status: 'ok', message: 'API  online' })
  const docsUi = await app.inject({ method: 'GET', url: '/docs' })
  assert.equal(docsUi.statusCode, 200)
  assert.match(docsUi.headers['content-type'], /text\/html/)
  const spec = await request('GET', '/docs/json')
  assert.equal(spec.status, 200)
  assert.equal(spec.body.openapi, '3.0.3')
  assert.ok(spec.body.paths['/auth/login']?.post?.requestBody)
  assert.ok(spec.body.paths['/tutorials/{id}']?.put?.requestBody)
  assert.ok(!spec.body.paths['/docs'])
  assert.equal((await request('POST', '/auth/register', {})).status, 400)
  assert.equal((await request('POST', '/auth/login', { email: 'invalid', password: 'x' })).status, 400)
  assert.equal((await request('GET', '/users')).status, 401)
  assert.equal((await request('GET', '/schools', undefined, bearer('invalid'))).status, 401)
  assert.equal((await request('GET', '/categories/1.5')).status, 400)
  assert.equal((await request('GET', '/tutorials/0')).status, 400)
  assert.equal((await request('PUT', '/categories/1', {})).status, 401)
})

test('register, login, me, duplicate email and password rejection', async t => {
  const { request, register, db } = await fixture(t)
  const registered = await register({ email: 'TEACHER@school.example' })
  assert.equal(registered.status, 201)
  assert.equal(registered.body.user.email, 'teacher@school.example')
  assert.equal(registered.body.user.onboardingStatus, 'PENDING')
  assert.ok(!('password' in registered.body.user))
  assert.match(db.tables.user[0].password, /^\$argon2id\$/)
  assert.match(registered.headers['set-cookie'], /HttpOnly/)
  assert.match(registered.headers['set-cookie'], /SameSite=Lax/)
  assert.ok(!('refreshToken' in registered.body))
  assert.equal((await register()).status, 409)
  assert.equal((await request('POST', '/auth/login', { email: 'teacher@school.example', password: 'wrong' })).status, 401)
  assert.equal((await request('POST', '/auth/login', { email: 'missing@school.example', password: 'x' })).status, 401)
  const login = await request('POST', '/auth/login', { email: 'teacher@school.example', password: 'original-password' })
  assert.equal(login.status, 200)
  assert.equal(login.body.onboardingAllowed, false)
  const me = await request('GET', '/auth/me', undefined, bearer(login.body.accessToken))
  assert.equal(me.body.user.id, registered.body.user.id)
  assert.ok(!('password' in me.body.user))
  assert.equal((await request('GET', '/users', undefined, bearer(login.body.accessToken))).status, 403)
})

test('legacy bcrypt accounts keep working after the architecture change', async t => {
  const { request, db } = await fixture(t)
  await db.user.create({ data: { name: 'Legacy', email: 'legacy@school.example', password: await bcrypt.hash('old-password', 4) } })
  assert.equal((await request('POST', '/auth/login', { email: 'legacy@school.example', password: 'old-password' })).status, 200)
})

test('refresh rotates the cookie, rejects replay, expiration, revoked sessions and logout', async t => {
  const { request, register, db } = await fixture(t)
  const original = await register()
  assert.equal((await request('POST', '/auth/refresh')).status, 400)
  const rotated = await request('POST', '/auth/refresh', undefined, { cookie: refreshCookie(original) })
  assert.equal(rotated.status, 200)
  assert.notEqual(refreshCookie(rotated), refreshCookie(original))
  assert.equal((await request('POST', '/auth/refresh', undefined, { cookie: refreshCookie(original) })).status, 401)
  assert.ok(!('password' in rotated.body.user))
  assert.equal((await request('POST', '/auth/logout', undefined, { cookie: refreshCookie(rotated) })).status, 200)
  assert.equal((await request('POST', '/auth/refresh', undefined, { cookie: refreshCookie(rotated) })).status, 401)
  const login = await request('POST', '/auth/login', { email: 'teacher@school.example', password: 'original-password' })
  db.tables.authSession.at(-1).expiresAt = new Date(0)
  assert.equal((await request('POST', '/auth/refresh', undefined, { cookie: refreshCookie(login) })).status, 401)
  assert.equal((await request('POST', '/auth/logout')).status, 200)
})

test('password recovery resets the password, consumes token and revokes refresh sessions', async t => {
  const { request, register, mail, db } = await fixture(t)
  const original = await register()
  const missing = await request('POST', '/auth/forgot-password', { email: 'missing@school.example' })
  const found = await request('POST', '/auth/forgot-password', { email: 'teacher@school.example' })
  assert.equal(missing.status, 200)
  assert.equal(found.status, 200)
  assert.deepEqual(missing.body, found.body)
  assert.equal(mail.length, 1)
  const token = new URL(mail[0].link).searchParams.get('token')
  assert.notEqual(db.tables.passwordResetToken[0].tokenHash, token)
  assert.equal((await request('POST', '/auth/reset-password', { token: 'bad', password: 'new-password' })).status, 400)
  assert.equal((await request('POST', '/auth/reset-password', { token, password: 'new-password' })).status, 200)
  assert.equal((await request('POST', '/auth/reset-password', { token, password: 'another-password' })).status, 400)
  assert.equal((await request('POST', '/auth/refresh', undefined, { cookie: refreshCookie(original) })).status, 401)
  assert.equal((await request('POST', '/auth/login', { email: 'teacher@school.example', password: 'original-password' })).status, 401)
  assert.equal((await request('POST', '/auth/login', { email: 'teacher@school.example', password: 'new-password' })).status, 200)
})

test('teacher onboarding checks relations and issues an updated access token', async t => {
  const { request, register, db } = await fixture(t)
  const user = await register()
  const headers = bearer(user.body.accessToken)
  assert.equal((await request('POST', '/auth/onboarding', {}, headers)).status, 400)
  assert.equal((await request('POST', '/auth/onboarding', { schoolId: 999 }, headers)).status, 404)
  assert.equal((await request('POST', '/auth/onboarding', { roboticsGroupId: 999 }, headers)).status, 404)
  const school = await db.school.create({ data: { name: 'Escola' } })
  const otherSchool = await db.school.create({ data: { name: 'Outra Escola' } })
  const group = await db.roboticsGroup.create({ data: { name: 'Grupo' } })
  const completed = await request('POST', '/auth/onboarding', { schoolId: school.id, roboticsGroupId: group.id }, headers)
  assert.equal(completed.status, 200)
  assert.equal(completed.body.user.onboardingStatus, 'COMPLETED')
  assert.equal((await request('POST', '/auth/onboarding', { schoolId: otherSchool.id }, headers)).status, 409)
  assert.equal((await request('POST', '/auth/onboarding', { schoolId: otherSchool.id }, bearer(completed.body.accessToken))).status, 409)
  assert.equal(db.tables.user[0].schoolId, school.id)
  assert.equal((await request('GET', '/projects', undefined, bearer(completed.body.accessToken))).status, 404)
  assert.equal((await request('GET', '/users', undefined, bearer(completed.body.accessToken))).status, 403)
})

test('CRUD for users/schools preserves envelopes, validation, password secrecy and user school lookup', async t => {
  const { request, createAdmin } = await fixture(t)
  const admin = await createAdmin()
  const headers = bearer(admin.body.accessToken)
  const school = await request('POST', '/schools', { name: 'Escola', address: 'Rua A' }, headers)
  assert.equal(school.status, 201)
  const user = await request('POST', '/users', { name: 'Outro', email: 'other@school.example', password: 'other-password', schoolId: school.body.school.id }, headers)
  assert.equal(user.status, 201)
  assert.ok(!('password' in user.body.user))
  assert.equal((await request('GET', '/users', undefined, headers)).body.users.length, 2)
  assert.equal((await request('GET', `/users/${user.body.user.id}/school`, undefined, headers)).body.school.name, 'Escola')
  assert.equal((await request('PUT', `/users/${user.body.user.id}`, { name: 'Atualizado', password: 'changed-password' }, headers)).body.user.name, 'Atualizado')
  assert.equal((await request('PUT', `/schools/${school.body.school.id}`, { address: '' }, headers)).body.school.address, '')
  assert.equal((await request('GET', '/schools', undefined, headers)).body.schools.length, 1)
  assert.equal((await request('DELETE', `/users/${user.body.user.id}`, undefined, headers)).status, 200)
  assert.equal((await request('GET', `/users/${user.body.user.id}`, undefined, headers)).status, 404)
  assert.equal((await request('POST', '/auth/onboarding', { schoolId: 1 }, headers)).status, 403)
})

test('categories, tutorials and projects are wired and update all declared fields', async t => {
  const { request, createAdmin } = await fixture(t)
  assert.equal((await request('GET', '/categories')).status, 404)
  const admin = await createAdmin()
  const headers = bearer(admin.body.accessToken)
  const category = (await request('POST', '/categories', { name: 'Mecânica' }, headers)).body.category
  const school = (await request('POST', '/schools', { name: 'Escola' }, headers)).body.school
  const tutorial = await request('POST', '/tutorials', { title: 'Robô', description: 'Montagem', categoryId: category.id,
    difficulty: 'EASY', schoolId: school.id, materialsNeeded: ['Motor'], tutorialUrl: 'https://example.com/tutorial' }, headers)
  assert.equal(tutorial.status, 201)
  assert.equal((await request('PUT', `/tutorials/${tutorial.body.tutorial.id}`, { title: 'Novo título', materialsNeeded: ['Sensor'] }, headers)).body.tutorial.title, 'Novo título')
  assert.deepEqual((await request('GET', `/tutorials/${tutorial.body.tutorial.id}`)).body.tutorial.materialsNeeded, ['Sensor'])
  assert.equal((await request('GET', '/tutorials')).body.tutorials.length, 1)
  const project = await request('POST', '/projects', { name: 'Projeto', schoolId: school.id }, headers)
  assert.equal(project.status, 201)
  assert.equal((await request('PUT', `/projects/${project.body.project.id}`, { description: 'Projeto atualizado' }, headers)).body.project.description, 'Projeto atualizado')
  assert.equal((await request('DELETE', `/projects/${project.body.project.id}`, undefined, headers)).status, 200)
  assert.equal((await request('DELETE', `/tutorials/${tutorial.body.tutorial.id}`, undefined, headers)).status, 200)
  assert.equal((await request('PUT', `/categories/${category.id}`, { name: 'Eletrônica' }, headers)).body.category.name, 'Eletrônica')
  assert.equal((await request('DELETE', `/categories/${category.id}`, undefined, headers)).status, 200)
})

test('categories and tutorials: public reads, protected writes, school-scoped teachers', async t => {
  const { request, register, createAdmin, db } = await fixture(t)
  const admin = bearer((await createAdmin()).body.accessToken)
  const schoolA = (await request('POST', '/schools', { name: 'A' }, admin)).body.school
  const schoolB = (await request('POST', '/schools', { name: 'B' }, admin)).body.school
  const category = (await request('POST', '/categories', { name: 'Mecânica' }, admin)).body.category
  const tutorialBody = schoolId => ({ title: 'Robô', description: 'Montagem', categoryId: category.id,
    difficulty: 'EASY', schoolId, materialsNeeded: ['Motor'] })
  // Anonymous: reads allowed, every write is 401.
  assert.equal((await request('GET', '/categories')).status, 200)
  assert.equal((await request('POST', '/categories', { name: 'X' })).status, 401)
  assert.equal((await request('PUT', `/categories/${category.id}`, { name: 'X' })).status, 401)
  assert.equal((await request('DELETE', `/categories/${category.id}`)).status, 401)
  assert.equal((await request('POST', '/tutorials', tutorialBody(schoolA.id))).status, 401)
  // Teacher of school A (onboarded).
  const registered = await register({ email: 'prof@school.example' })
  const onboarded = await request('POST', '/auth/onboarding', { schoolId: schoolA.id }, bearer(registered.body.accessToken))
  assert.equal(onboarded.status, 200)
  const teacher = bearer(onboarded.body.accessToken)
  assert.equal(db.tables.user.find(u => u.email === 'prof@school.example').schoolId, schoolA.id, String(registered.status))
  assert.equal((await request('POST', '/categories', { name: 'X' }, teacher)).status, 403)
  assert.equal((await request('PUT', `/categories/${category.id}`, { name: 'X' }, teacher)).status, 403)
  assert.equal((await request('DELETE', `/categories/${category.id}`, undefined, teacher)).status, 403)
  assert.equal((await request('POST', '/tutorials', tutorialBody(schoolB.id), teacher)).status, 403)
  const own = await request('POST', '/tutorials', tutorialBody(schoolA.id), teacher)
  assert.equal(own.status, 201)
  const ownId = own.body.tutorial.id
  assert.equal((await request('PUT', `/tutorials/${ownId}`, { title: 'Novo' }, teacher)).status, 200)
  assert.equal((await request('PUT', `/tutorials/${ownId}`, { schoolId: schoolB.id }, teacher)).status, 403)
  const foreign = (await request('POST', '/tutorials', tutorialBody(schoolB.id), admin)).body.tutorial.id
  assert.equal((await request('PUT', `/tutorials/${foreign}`, { title: 'Hack' }, teacher)).status, 403)
  assert.equal((await request('DELETE', `/tutorials/${foreign}`, undefined, teacher)).status, 403)
  assert.equal((await request('DELETE', `/tutorials/${ownId}`, undefined, teacher)).status, 200)
  assert.equal((await request('DELETE', `/tutorials/${foreign}`, undefined, admin)).status, 200)
})
test('teachers can be linked to several schools and see them in /auth/me and scoped writes', async t => {
  const { request, register, createAdmin } = await fixture(t)
  const admin = bearer((await createAdmin()).body.accessToken)
  const [a, b, c] = await Promise.all(['A', 'B', 'C'].map(async name =>
    (await request('POST', '/schools', { name, description: `Descrição ${name}` }, admin)).body.school))
  assert.equal(a.description, 'Descrição A')
  const registered = await register({ email: 'multi@school.example' })
  const onboarded = await request('POST', '/auth/onboarding', { schoolId: a.id }, bearer(registered.body.accessToken))
  assert.equal(onboarded.status, 200)
  const login = await request('POST', '/auth/login', { email: 'multi@school.example', password: 'original-password' })
  const teacher = bearer(login.body.accessToken)
  assert.deepEqual(login.body.user.schools.map(s => s.id), [a.id])
  const updated = await request('PUT', `/users/${login.body.user.id}`, { schoolIds: [a.id, b.id] }, admin)
  assert.equal(updated.status, 200)
  assert.deepEqual(updated.body.user.schools.map(s => s.id), [a.id, b.id])
  assert.deepEqual((await request('GET', '/auth/me', undefined, teacher)).body.user.schools.map(s => s.id), [a.id, b.id])
  assert.equal((await request('POST', '/projects', { name: 'P', schoolId: b.id }, teacher)).status, 201)
  assert.equal((await request('POST', '/projects', { name: 'P', schoolId: c.id }, teacher)).status, 403)
})
test('announcements: admin writes, any authenticated user reads', async t => {
  const { request, register, createAdmin } = await fixture(t)
  const admin = bearer((await createAdmin()).body.accessToken)
  const school = (await request('POST', '/schools', { name: 'A' }, admin)).body.school
  const registered = await register({ email: 'prof@school.example' })
  await request('POST', '/auth/onboarding', { schoolId: school.id }, bearer(registered.body.accessToken))
  const teacher = bearer((await request('POST', '/auth/login', { email: 'prof@school.example', password: 'original-password' })).body.accessToken)
  assert.equal((await request('GET', '/announcements')).status, 401)
  assert.deepEqual((await request('GET', '/announcements', undefined, teacher)).body.announcements, [])
  assert.equal((await request('POST', '/announcements', { title: 'Oi', message: 'Reunião' }, teacher)).status, 403)
  assert.equal((await request('POST', '/announcements', { title: '', message: 'x' }, admin)).status, 400)
  const created = await request('POST', '/announcements', { title: 'Reunião', message: 'Sexta às 14h' }, admin)
  assert.equal(created.status, 201)
  assert.equal((await request('GET', '/announcements', undefined, teacher)).body.announcements[0].title, 'Reunião')
  assert.equal((await request('DELETE', `/announcements/${created.body.announcement.id}`, undefined, admin)).status, 200)
})
test('unified user creation validates conditional fields for PROFESSOR and ADMINISTRADOR profiles', async t => {
  const { request, createAdmin } = await fixture(t)
  const admin = bearer((await createAdmin()).body.accessToken)
  const school = (await request('POST', '/schools', { name: 'Escola A' }, admin)).body.school

  // PROFESSOR requires matricula and at least 1 linked school
  const missingMatricula = await request('POST', '/users', {
    name: 'Prof Sem Matricula',
    email: 'prof1@school.example',
    password: 'StrongPassword1!',
    perfil: 'PROFESSOR',
    schoolIds: [school.id],
  }, admin)
  assert.equal(missingMatricula.status, 400)

  const missingSchools = await request('POST', '/users', {
    name: 'Prof Sem Escola',
    email: 'prof2@school.example',
    password: 'StrongPassword1!',
    perfil: 'PROFESSOR',
    matricula: '12345',
    schoolIds: [],
  }, admin)
  assert.equal(missingSchools.status, 400)

  const validTeacher = await request('POST', '/users', {
    name: 'Prof Valido',
    email: 'prof3@school.example',
    password: 'StrongPassword1!',
    perfil: 'PROFESSOR',
    matricula: '202610',
    schoolIds: [school.id],
  }, admin)
  assert.equal(validTeacher.status, 201)
  assert.equal(validTeacher.body.user.role, 'TEACHER')
  assert.equal(validTeacher.body.user.perfil, 'PROFESSOR')
  assert.equal(validTeacher.body.user.permissaoAdministrador, false)
  assert.equal(validTeacher.body.user.matricula, '202610')
  assert.deepEqual(validTeacher.body.user.schools.map(s => s.id), [school.id])

  // ADMINISTRADOR accepts null/empty matricula and empty schools ([]), setting permissaoAdministrador: true
  const validAdmin = await request('POST', '/users', {
    name: 'Admin Geral',
    email: 'admingeral@school.example',
    password: 'StrongPassword1!',
    perfil: 'ADMINISTRADOR',
    matricula: null,
    schoolIds: [],
  }, admin)
  assert.equal(validAdmin.status, 201)
  assert.equal(validAdmin.body.user.role, 'ADMIN')
  assert.equal(validAdmin.body.user.perfil, 'ADMINISTRADOR')
  assert.equal(validAdmin.body.user.permissaoAdministrador, true)
  assert.equal(validAdmin.body.user.matricula, null)
  assert.deepEqual(validAdmin.body.user.schools, [])

  // Admin cannot delete their own logged-in account
  const me = (await request('GET', '/auth/me', undefined, admin)).body.user
  const selfDelete = await request('DELETE', `/users/${me.id}`, undefined, admin)
  assert.equal(selfDelete.status, 400)

  // Admin can delete another user safely even with N:N linked schools
  const deletedTeacher = await request('DELETE', `/users/${validTeacher.body.user.id}`, undefined, admin)
  assert.equal(deletedTeacher.status, 200)
  assert.equal(deletedTeacher.body.user.id, validTeacher.body.user.id)
  assert.equal((await request('GET', `/users/${validTeacher.body.user.id}`, undefined, admin)).status, 404)
})
test('Google Strategy verifies audience, domain, email verification, creates and links accounts', async t => {
  let payload = { email: 'google@school.example', sub: 'google-sub', email_verified: true, name: 'Google User' }
  const calls = []
  const { request, register, db } = await fixture(t, { googleClient: {
    verifyIdToken: async (options) => { calls.push(options); return { getPayload: () => payload } },
  } })
  const google = () => request('POST', '/auth/google', { idToken: 'signed-google-token' })
  assert.equal((await google()).status, 200)
  assert.equal(db.tables.user[0].authProvider, 'GOOGLE')
  assert.deepEqual(calls[0], { idToken: 'signed-google-token', audience: config.GOOGLE_CLIENT_ID })
  await google()
  assert.equal(db.tables.user.length, 1)
  payload = { ...payload, email: 'outsider@example.com', sub: 'outsider' }
  assert.equal((await google()).status, 403)
  payload = { ...payload, email_verified: false }
  assert.equal((await google()).status, 401)
  await register({ email: 'linked@school.example' })
  payload = { ...payload, email: 'linked@school.example', sub: 'linked-id', email_verified: true }
  assert.equal((await google()).status, 200)
  assert.equal(db.tables.user.length, 2)
  assert.equal(db.tables.user[1].googleId, 'linked-id')
})

test('projects are school-scoped: teachers cannot read or change other schools projects', async t => {
  const { request, register, createAdmin } = await fixture(t)
  const admin = bearer((await createAdmin()).body.accessToken)
  const schoolA = (await request('POST', '/schools', { name: 'A' }, admin)).body.school
  const schoolB = (await request('POST', '/schools', { name: 'B' }, admin)).body.school
  const projectA = (await request('POST', '/projects', { name: 'Projeto A', schoolId: schoolA.id }, admin)).body.project
  const projectB = (await request('POST', '/projects', { name: 'Projeto B', schoolId: schoolB.id }, admin)).body.project
  const registered = await register({ email: 'prof@school.example' })
  const onboarded = await request('POST', '/auth/onboarding', { schoolId: schoolA.id }, bearer(registered.body.accessToken))
  assert.equal(onboarded.status, 200)
  const teacher = bearer(onboarded.body.accessToken)
  // Own school: full access.
  const own = await request('POST', '/projects', { name: 'Novo', schoolId: schoolA.id }, teacher)
  assert.equal(own.status, 201)
  assert.equal((await request('GET', `/projects/${projectA.id}`, undefined, teacher)).status, 200)
  assert.equal((await request('PUT', `/projects/${projectA.id}`, { name: 'Editado' }, teacher)).status, 200)
  assert.deepEqual((await request('GET', '/projects', undefined, teacher)).body.projects.map(p => p.schoolId), [schoolA.id, schoolA.id])
  // Other school: every operation is denied.
  assert.equal((await request('POST', '/projects', { name: 'X', schoolId: schoolB.id }, teacher)).status, 403)
  assert.equal((await request('GET', `/projects/${projectB.id}`, undefined, teacher)).status, 403)
  assert.equal((await request('PUT', `/projects/${projectB.id}`, { name: 'Hack' }, teacher)).status, 403)
  assert.equal((await request('PUT', `/projects/${projectA.id}`, { schoolId: schoolB.id }, teacher)).status, 403)
  assert.equal((await request('DELETE', `/projects/${projectB.id}`, undefined, teacher)).status, 403)
  assert.equal((await request('GET', '/projects', undefined, admin)).body.projects.length, 3)
  // Teacher without a school (onboarded only via group) has no project access.
  const outsider = await register({ email: 'nogroup@school.example' })
  assert.equal((await request('GET', '/projects', undefined, bearer(outsider.body.accessToken))).status, 403)
  // Admin keeps full access.
  assert.equal((await request('DELETE', `/projects/${projectB.id}`, undefined, admin)).status, 200)
})

test('CORS only allows configured origins and supports cookies and all CRUD methods', async t => {
  const db = new MemoryDatabase()
  const app = await buildApp({ db, config: { ...config, CORS_ORIGINS: ['http://frontend.example'] } })
  t.after(() => app.close())
  const preflight = (origin, method = 'PUT') => app.inject({ method: 'OPTIONS', url: '/projects/1',
    headers: { origin, 'access-control-request-method': method, 'access-control-request-headers': 'authorization,content-type' } })
  const allowed = await preflight('http://frontend.example')
  assert.equal(allowed.headers['access-control-allow-origin'], 'http://frontend.example')
  assert.equal(allowed.headers['access-control-allow-credentials'], 'true')
  assert.match(allowed.headers['access-control-allow-methods'], /PUT/)
  assert.match((await preflight('http://frontend.example', 'DELETE')).headers['access-control-allow-methods'], /DELETE/)
  const simple = await app.inject({ method: 'GET', url: '/status', headers: { origin: 'http://frontend.example' } })
  assert.equal(simple.headers['access-control-allow-origin'], 'http://frontend.example')
  assert.equal(simple.headers['access-control-allow-credentials'], 'true')
  const denied = await preflight('http://evil.example')
  // Sem Allow-Origin o navegador bloqueia a resposta, mesmo que o plugin envie Allow-Credentials.
  assert.equal(denied.headers['access-control-allow-origin'], undefined)
})

test('loadConfig validates CORS_ORIGINS and rejects wildcards', async () => {
  const { loadConfig } = await import('../src/config/env.js')
  const base = { DATABASE_URL: 'mysql://u:p@127.0.0.1:3306/db', JWT_ACCESS_SECRET: 'x'.repeat(32) }
  assert.deepEqual(loadConfig(base).CORS_ORIGINS, ['http://localhost:3000'])
  assert.deepEqual(loadConfig({ ...base, CORS_ORIGINS: 'https://a.example/, https://b.example' }).CORS_ORIGINS,
    ['https://a.example', 'https://b.example'])
  assert.throws(() => loadConfig({ ...base, CORS_ORIGINS: '*' }))
  assert.throws(() => loadConfig({ ...base, CORS_ORIGINS: 'https://a.example/path' }))
})

test('multi-image upload endpoint and fluid images in projects and tutorials', async t => {
  const { request, createAdmin, app } = await fixture(t)
  const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  const sampleJpg = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString('base64')

  assert.equal((await request('POST', '/uploads/images', { image: samplePng })).status, 401)

  const admin = bearer((await createAdmin()).body.accessToken)
  assert.equal((await request('POST', '/uploads/images', {}, admin)).status, 400)
  assert.equal((await request('POST', '/uploads/images', { image: 'data:image/png;base64,aGVsbG8=' }, admin)).status, 400)

  const uploaded = await request('POST', '/uploads/images', { images: [samplePng, sampleJpg] }, admin)
  assert.equal(uploaded.status, 201)
  assert.equal(uploaded.body.images.length, 2)
  assert.equal(uploaded.body.imageUrl, uploaded.body.images[0])
  assert.match(uploaded.body.imageUrl, /^http:\/\/localhost:3333\/uploads\/[a-f0-9-]+\.png$/)

  const filename = uploaded.body.imageUrl.split('/').pop()
  const served = await app.inject({ method: 'GET', url: `/uploads/${filename}` })
  assert.equal(served.statusCode, 200)
  assert.match(served.headers['content-type'], /image\/png/)
  assert.equal((await request('GET', '/uploads/invalid..png')).status, 400)
  assert.equal((await request('GET', '/uploads/00000000-0000-0000-0000-000000000000.png')).status, 404)

  const school = (await request('POST', '/schools', { name: 'Escola' }, admin)).body.school
  const category = (await request('POST', '/categories', { name: 'Mecânica' }, admin)).body.category

  const project = await request('POST', '/projects', {
    name: 'Robô Seguidor',
    description: 'Com fotos',
    schoolId: school.id,
    images: [samplePng, sampleJpg],
  }, admin)
  assert.equal(project.status, 201)
  assert.equal(project.body.project.images.length, 2)
  assert.equal(project.body.project.imageUrl, project.body.project.images[0])

  const projectList = await request('GET', '/projects', undefined, admin)
  assert.equal(projectList.status, 200)
  assert.equal(projectList.body.projects[0].imageUrl, project.body.project.imageUrl)
  assert.deepEqual(projectList.body.projects[0].images, project.body.project.images)

  const updatedProject = await request('PUT', `/projects/${project.body.project.id}`, {
    images: [project.body.project.images[0], samplePng],
  }, admin)
  assert.equal(updatedProject.status, 200)
  assert.equal(updatedProject.body.project.images.length, 2)
  assert.equal(updatedProject.body.project.images[0], project.body.project.images[0])

  const tutorial = await request('POST', '/tutorials', {
    title: 'Montagem do Chassi',
    description: 'Passo a passo',
    categoryId: category.id,
    difficulty: 'EASY',
    schoolId: school.id,
    materialsNeeded: ['Chassi', 'Rodas'],
    images: [samplePng],
  }, admin)
  assert.equal(tutorial.status, 201)
  assert.equal(tutorial.body.tutorial.images.length, 1)
  assert.equal(tutorial.body.tutorial.imageUrl, tutorial.body.tutorial.images[0])

  const tutorialList = await request('GET', '/tutorials')
  assert.equal(tutorialList.status, 200)
  assert.equal(tutorialList.body.tutorials[0].imageUrl, tutorial.body.tutorial.imageUrl)
  assert.deepEqual(tutorialList.body.tutorials[0].images, tutorial.body.tutorial.images)
})

test('resolvePoolConfig parses MySQL/MariaDB URLs and SSL parameters for cloud databases', async () => {
  const { resolvePoolConfig } = await import('../src/core/database/prisma.js')
  const local = resolvePoolConfig('mysql://root:secret@127.0.0.1:3306/robotica')
  assert.equal(local.host, '127.0.0.1')
  assert.equal(local.port, 3306)
  assert.equal(local.ssl, undefined)

  const tidb = resolvePoolConfig('mysql://user:pass@gateway01.prod.aws.tidbcloud.com:4000/test?sslaccept=strict')
  assert.equal(tidb.port, 4000)
  assert.deepEqual(tidb.ssl, { rejectUnauthorized: true })

  const aiven = resolvePoolConfig('mysql://avnadmin:pass@mysql-demo.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED')
  assert.deepEqual(aiven.ssl, { rejectUnauthorized: false })

  assert.throws(() => resolvePoolConfig('postgres://user:pass@localhost:5432/db'))
})

test('TokenService uses SameSite=None and Secure for refresh cookie in production', async t => {
  const db = new MemoryDatabase()
  const app = await buildApp({ db, config: { ...config, NODE_ENV: 'production' } })
  t.after(() => app.close())
  const response = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { name: 'Prod User', email: 'prod@school.example', password: 'valid-password' },
  })
  assert.equal(response.statusCode, 201)
  assert.match(response.headers['set-cookie'], /SameSite=None/)
  assert.match(response.headers['set-cookie'], /Secure/)
  assert.match(response.headers['set-cookie'], /HttpOnly/)
})

test('robotics groups (/groups) CRUD, school-scoped teacher permissions and long descriptions', async t => {
  const { request, register, createAdmin } = await fixture(t)
  const admin = bearer((await createAdmin()).body.accessToken)
  const schoolA = (await request('POST', '/schools', { name: 'EMEF A' }, admin)).body.school
  const schoolB = (await request('POST', '/schools', { name: 'EMEF B' }, admin)).body.school

  assert.equal((await request('GET', '/groups')).status, 401)
  assert.equal((await request('GET', '/groups', undefined, admin)).status, 404)

  const groupA = await request('POST', '/groups', {
    name: 'BioBot Alpha',
    students: 'Ana Laura, João Lattaro, Sthefany Santiago',
    grade: '8º Ano',
    schoolId: schoolA.id,
  }, admin)
  assert.equal(groupA.status, 201)
  assert.equal(groupA.body.group.name, 'BioBot Alpha')
  assert.equal(groupA.body.group.students, 'Ana Laura, João Lattaro, Sthefany Santiago')
  assert.equal(groupA.body.group.grade, '8º Ano')
  assert.equal(groupA.body.group.school.name, 'EMEF A')

  const groupB = (await request('POST', '/groups', {
    name: 'BioBot Beta',
    students: 'Lucas Perrotta',
    grade: '9º Ano',
    schoolId: schoolB.id,
  }, admin)).body.group

  const registered = await register({ email: 'prof@school.example' })
  const onboarded = await request('POST', '/auth/onboarding', { schoolId: schoolA.id }, bearer(registered.body.accessToken))
  const teacher = bearer(onboarded.body.accessToken)

  const teacherCreated = await request('POST', '/groups', {
    name: 'BioBot Gamma',
    students: 'Maria Clara',
    grade: '7º Ano',
  }, teacher)
  assert.equal(teacherCreated.status, 201)
  assert.equal(teacherCreated.body.group.schoolId, schoolA.id)

  const teacherList = await request('GET', '/groups', undefined, teacher)
  assert.equal(teacherList.status, 200)
  assert.deepEqual(teacherList.body.groups.map((g) => g.schoolId), [schoolA.id, schoolA.id])

  assert.equal((await request('GET', `/groups/${groupA.body.group.id}`, undefined, teacher)).status, 200)
  assert.equal((await request('PUT', `/groups/${groupA.body.group.id}`, { grade: '9º Ano' }, teacher)).status, 200)
  assert.equal((await request('POST', '/groups', { name: 'Invasor', schoolId: schoolB.id }, teacher)).status, 403)
  assert.equal((await request('GET', `/groups/${groupB.id}`, undefined, teacher)).status, 403)
  assert.equal((await request('PUT', `/groups/${groupB.id}`, { name: 'Hack' }, teacher)).status, 403)
  assert.equal((await request('PUT', `/groups/${groupA.body.group.id}`, { schoolId: schoolB.id }, teacher)).status, 403)
  assert.equal((await request('DELETE', `/groups/${groupB.id}`, undefined, teacher)).status, 403)
  assert.equal((await request('DELETE', `/groups/${teacherCreated.body.group.id}`, undefined, teacher)).status, 200)
  assert.equal((await request('DELETE', `/groups/${groupB.id}`, undefined, admin)).status, 200)

  const longDescription = 'Robótica educacional com materiais sustentáveis e programação em blocos. '.repeat(12).trim()
  const category = (await request('POST', '/categories', { name: 'Sustentabilidade' }, admin)).body.category
  const project = await request('POST', '/projects', {
    name: 'Projeto Texto Longo',
    description: longDescription,
    schoolId: schoolA.id,
  }, teacher)
  assert.equal(project.status, 201)
  assert.equal(project.body.project.description, longDescription)

  const tutorial = await request('POST', '/tutorials', {
    title: 'Tutorial Texto Longo',
    description: longDescription,
    categoryId: category.id,
    difficulty: 'MEDIUM',
    schoolId: schoolA.id,
    materialsNeeded: ['Placa', 'Sensores'],
  }, teacher)
  assert.equal(tutorial.status, 201)
  assert.equal(tutorial.body.tutorial.description, longDescription)
})
