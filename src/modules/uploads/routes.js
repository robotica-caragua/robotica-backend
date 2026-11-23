export function uploadRoutes(app, controller, policy) {
  const guards = [policy.authenticate, policy.completed]
  app.post('/uploads/images', { preHandler: guards }, controller.upload)
  app.get('/uploads/:filename', controller.serveLocal)
}
