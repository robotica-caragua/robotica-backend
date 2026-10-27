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
  return { app, db, mail, request, register }
}
const bearer = (token) => ({ authorization: `Bearer ${token}` })
const refreshCookie = (result) => result.headers['set-cookie'].split(';')[0]

test('status, validation and protected endpoints preserve the HTTP contract', async t => {
  const { request } = await fixture(t)
  assert.deepEqual((await request('GET', '/status')).body, { status: 'ok', message: 'API  online' })
  assert.equal((await request('POST', '/auth/register', {})).status, 400)
  assert.equal((await request('POST', '/auth/login', { email: 'invalid', password: 'x' })).status, 400)
  assert.equal((await request('GET', '/users')).status, 401)
  assert.equal((await request('GET', '/schools', undefined, bearer('invalid'))).status, 401)
  assert.equal((await request('GET', '/categories/1.5')).status, 400)
  assert.equal((await request('GET', '/tutorials/0')).status, 400)
  assert.equal((await request('PUT', '/categories/1', {})).status, 400)
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
  const group = await db.roboticsGroup.create({ data: { name: 'Grupo' } })
  const completed = await request('POST', '/auth/onboarding', { schoolId: school.id, roboticsGroupId: group.id }, headers)
  assert.equal(completed.status, 200)
  assert.equal(completed.body.user.onboardingStatus, 'COMPLETED')
  assert.equal((await request('GET', '/projects', undefined, bearer(completed.body.accessToken))).status, 404)
  assert.equal((await request('GET', '/users', undefined, bearer(completed.body.accessToken))).status, 403)
})

test('CRUD for users/schools preserves envelopes, validation, password secrecy and user school lookup', async t => {
  const { request, register } = await fixture(t)
  const admin = await register({ role: 'ADMIN', email: 'admin@school.example' })
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
  const { request, register } = await fixture(t)
  assert.equal((await request('GET', '/categories')).status, 404)
  const category = (await request('POST', '/categories', { name: 'Mecânica' })).body.category
  const admin = await register({ role: 'ADMIN' })
  const headers = bearer(admin.body.accessToken)
  const school = (await request('POST', '/schools', { name: 'Escola' }, headers)).body.school
  const tutorial = await request('POST', '/tutorials', { title: 'Robô', description: 'Montagem', categoryId: category.id,
    difficulty: 'EASY', schoolId: school.id, materialsNeeded: ['Motor'], tutorialUrl: 'https://example.com/tutorial' })
  assert.equal(tutorial.status, 201)
  assert.equal((await request('PUT', `/tutorials/${tutorial.body.tutorial.id}`, { title: 'Novo título', materialsNeeded: ['Sensor'] })).body.tutorial.title, 'Novo título')
  assert.deepEqual((await request('GET', `/tutorials/${tutorial.body.tutorial.id}`)).body.tutorial.materialsNeeded, ['Sensor'])
  assert.equal((await request('GET', '/tutorials')).body.tutorials.length, 1)
  const project = await request('POST', '/projects', { name: 'Projeto', schoolId: school.id }, headers)
  assert.equal(project.status, 201)
  assert.equal((await request('PUT', `/projects/${project.body.project.id}`, { description: 'Projeto atualizado' }, headers)).body.project.description, 'Projeto atualizado')
  assert.equal((await request('DELETE', `/projects/${project.body.project.id}`, undefined, headers)).status, 200)
  assert.equal((await request('DELETE', `/tutorials/${tutorial.body.tutorial.id}`)).status, 200)
  assert.equal((await request('PUT', `/categories/${category.id}`, { name: 'Eletrônica' })).body.category.name, 'Eletrônica')
  assert.equal((await request('DELETE', `/categories/${category.id}`)).status, 200)
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
