// Contract shared by interchangeable authentication algorithms.
export class AuthenticationStrategy {
  async authenticate(_credentials) {
    throw new Error('AuthenticationStrategy.authenticate deve ser implementado.')
  }
}
