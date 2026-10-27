import { randomBytes, createHash } from 'node:crypto'

export class TokenService {
  constructor(jwt, config) { Object.assign(this, { jwt, config }) }
  sign(user) {
    return this.jwt.sign({ userId: user.id, role: user.role, onboardingStatus: user.onboardingStatus }, {
      expiresIn: this.config.JWT_ACCESS_EXPIRES_IN,
    })
  }
  verify(token) { return this.jwt.verify(token) }
  generate() { return randomBytes(48).toString('hex') }
  hash(token) { return createHash('sha256').update(token).digest('hex') }
  expiresAt() { return new Date(Date.now() + this.config.JWT_REFRESH_EXPIRES_IN_DAYS * 86400000) }
  readRefresh(request) {
    const header = request.headers.authorization
    if (header?.startsWith('Refresh ')) return header.slice(8).trim()
    return request.cookies.refreshToken || null
  }
  cookieOptions(expires) {
    return { httpOnly: true, path: '/', sameSite: 'lax', secure: this.config.NODE_ENV === 'production', expires }
  }
  setCookie(reply, token, expires) { reply.setCookie('refreshToken', token, this.cookieOptions(expires)) }
  clearCookie(reply) { reply.clearCookie('refreshToken', this.cookieOptions(new Date(0))) }
}
