export function authRoutes(app, controller, policy) {
  app.post('/auth/register', controller.register)
  app.post('/auth/login', controller.login)
  app.post('/auth/google', controller.google)
  app.post('/auth/refresh', controller.refresh)
  app.post('/auth/logout', controller.logout)
  app.post('/auth/forgot-password', controller.forgotPassword)
  app.post('/auth/reset-password', controller.resetPassword)
  app.get('/auth/me', { preHandler: [policy.authenticate] }, controller.me)
  app.post('/auth/onboarding', { preHandler: [policy.authenticate, policy.role('TEACHER')] }, controller.onboarding)
}
