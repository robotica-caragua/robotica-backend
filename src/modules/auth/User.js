export class User {
  constructor(record) { Object.assign(this, record) }
  get onboardingAllowed() { return this.role !== 'TEACHER' || this.onboardingStatus === 'COMPLETED' }
  toPublic() {
    const { id, name, email, matricula, role, authProvider, onboardingStatus, onboardingCompletedAt,
      schoolId, schools, roboticsGroupId, createdAt, updatedAt } = this
    return {
      id,
      name,
      email,
      matricula: matricula ?? null,
      role,
      perfil: role === 'ADMIN' ? 'ADMINISTRADOR' : 'PROFESSOR',
      permissaoAdministrador: role === 'ADMIN',
      authProvider,
      onboardingStatus,
      onboardingCompletedAt,
      schoolId,
      schools: schools ?? [],
      roboticsGroupId,
      createdAt,
      updatedAt,
    }
  }
}
