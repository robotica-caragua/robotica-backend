export class User {
  constructor(record) { Object.assign(this, record) }
  get onboardingAllowed() { return this.role !== 'TEACHER' || this.onboardingStatus === 'COMPLETED' }
  toPublic() {
    const { id, name, email, role, authProvider, onboardingStatus, onboardingCompletedAt,
      schoolId, roboticsGroupId, createdAt, updatedAt } = this
    return { id, name, email, role, authProvider, onboardingStatus, onboardingCompletedAt,
      schoolId, roboticsGroupId, createdAt, updatedAt }
  }
}
