import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AuthService } from '../src/modules/auth/AuthService.js'
import { AuthenticationStrategy } from '../src/modules/auth/strategies/AuthenticationStrategy.js'
import { GoogleAuthenticationStrategy } from '../src/modules/auth/strategies/GoogleAuthenticationStrategy.js'
import { buildApp } from '../src/app.js'
import { MemoryDatabase } from './helpers/MemoryDatabase.js'

test('AuthService accepts a new Strategy without changing its login algorithm', async () => {
  class ClassroomStrategy extends AuthenticationStrategy {
    async authenticate({ code }) {
      assert.equal(code, 'classroom-code')
      return { id: 7, role: 'TEACHER', onboardingStatus: 'COMPLETED', password: 'never-return-this' }
    }
  }
  const service = new AuthService({ strategies: new Map([['classroom', new ClassroomStrategy()]]),
    tokens: { generate: () => 'refresh', hash: () => 'hash', expiresAt: () => new Date(), sign: user => `access-${user.id}` },
    sessions: { createSession: async (_id, hash, expiresAt) => {
      assert.equal(hash, 'hash')
      return { id: 3, expiresAt }
    } } })
  const result = await service.login('classroom', { code: 'classroom-code' })
  assert.equal(result.accessToken, 'access-7')
  assert.equal(result.onboardingAllowed, true)
  assert.ok(!('password' in result.user))
  await assert.rejects(service.login('missing', {}), { statusCode: 400 })
})

test('Google Strategy rejects missing configuration and invalid signatures', async () => {
  const missing = new GoogleAuthenticationStrategy({}, {}, {}, {})
  await assert.rejects(missing.authenticate({ idToken: 'x' }), { statusCode: 500 })
  const invalid = new GoogleAuthenticationStrategy({}, {}, { verifyIdToken: async () => { throw new Error('bad signature') } },
    { GOOGLE_CLIENT_ID: 'id', GOOGLE_ALLOWED_DOMAIN: 'school.example' })
  await assert.rejects(invalid.authenticate({ idToken: 'x' }), { statusCode: 401 })
})

test('concurrent refresh requests allow only one rotation and reject expiration of reset tokens', async t => {
  const db = new MemoryDatabase()
  const app = await buildApp({ db, config: { NODE_ENV: 'test', JWT_ACCESS_SECRET: 'concurrency-test-secret-at-least-32-characters',
    JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN_DAYS: 1 } })
  t.after(() => app.close())
  const registered = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Test', email: 'test@example.com', password: 'valid-password' } })
  const cookie = registered.headers['set-cookie'].split(';')[0]
  const responses = await Promise.all([1, 2].map(() => app.inject({ method: 'POST', url: '/auth/refresh', headers: { cookie } })))
  assert.deepEqual(responses.map(response => response.statusCode).sort(), [200, 401])
  const { createHash } = await import('node:crypto')
  await db.passwordResetToken.create({ data: { userId: 1, tokenHash: createHash('sha256').update('expired').digest('hex'), expiresAt: new Date(0) } })
  const reset = await app.inject({ method: 'POST', url: '/auth/reset-password', payload: { token: 'expired', password: 'new-password' } })
  assert.equal(reset.statusCode, 400)
})

test('authentication rate limit rejects excessive attempts', async t => {
  const app = await buildApp({ db: new MemoryDatabase(), config: {
    NODE_ENV: 'test', JWT_ACCESS_SECRET: 'rate-limit-test-secret-at-least-32-characters',
  } })
  t.after(() => app.close())
  for (let i = 0; i < 30; i++) {
    const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'missing@example.com', password: 'wrong' } })
    assert.equal(response.statusCode, 401)
  }
  const limited = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'missing@example.com', password: 'wrong' } })
  assert.equal(limited.statusCode, 429)
})
