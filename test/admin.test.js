import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../src/app.js'
import { MemoryDatabase } from './helpers/MemoryDatabase.js'
import { AdminProvisioner } from '../src/modules/users/AdminProvisioner.js'
import { AuthService } from '../src/modules/auth/AuthService.js'

test('public registration cannot grant ADMIN or inject onboarding fields', async t => {
  const db = new MemoryDatabase()
  const app = await buildApp({ db, config: {
    NODE_ENV: 'test', JWT_ACCESS_SECRET: 'registration-test-secret-at-least-32-characters',
    JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN_DAYS: 1,
  } })
  t.after(() => app.close())
  const response = await app.inject({ method: 'POST', url: '/auth/register', payload: {
    name: 'Test', email: 'test@example.com', password: 'test-password', role: 'ADMIN',
    onboardingStatus: 'COMPLETED', authProvider: 'GOOGLE', googleId: 'injected',
  } })
  assert.equal(response.statusCode, 201)
  const body = response.json()
  assert.equal(body.user.role, 'TEACHER')
  assert.equal(body.user.onboardingStatus, 'PENDING')
  assert.equal(db.tables.user[0].role, 'TEACHER')
  assert.equal(db.tables.user[0].authProvider, 'LOCAL')
  assert.equal(db.tables.user[0].googleId, null)
  assert.equal(app.jwt.verify(body.accessToken).role, 'TEACHER')
  const denied = await app.inject({ method: 'POST', url: '/schools', payload: { name: 'Escola' },
    headers: { authorization: `Bearer ${body.accessToken}` } })
  assert.equal(denied.statusCode, 403)
})

test('registration service enforces TEACHER even without the HTTP validator', async () => {
  let saved
  const service = new AuthService({ users: { create: async data => { saved = data; return { id: 1, ...data } } },
    passwords: { hash: async () => 'hashed' } })
  service.issueSession = async user => user
  await service.register({ name: 'Test', email: 'test@example.com', password: 'test-password', role: 'ADMIN', googleId: 'injected' })
  assert.equal(saved.role, 'TEACHER')
  assert.equal(saved.onboardingStatus, 'PENDING')
  assert.ok(!('googleId' in saved))
})

test('internal promotion preserves credentials, completes onboarding and revokes sessions', async () => {
  const db = new MemoryDatabase()
  const user = await db.user.create({ data: { email: 'admin@example.com', name: 'Admin', password: 'existing-hash' } })
  await db.authSession.create({ data: { userId: user.id, refreshTokenHash: 'old-hash', expiresAt: new Date(Date.now() + 60000) } })
  const provisioner = new AdminProvisioner(db)
  assert.deepEqual(await provisioner.promote(user.email), { id: user.id, email: user.email, role: 'ADMIN' })
  assert.equal(db.tables.user[0].password, 'existing-hash')
  assert.equal(db.tables.user[0].onboardingStatus, 'COMPLETED')
  assert.ok(db.tables.authSession[0].revokedAt instanceof Date)
  await provisioner.promote(user.email)
  assert.equal(db.tables.user.length, 1)
  await assert.rejects(provisioner.promote('missing@example.com'), { statusCode: 404 })
  assert.equal(db.tables.user.length, 1)
})
