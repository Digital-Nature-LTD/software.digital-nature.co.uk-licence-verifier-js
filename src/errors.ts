export class LicenceVerifierError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message)
    this.name = 'LicenceVerifierError'
  }
}

export class LicenceNotFoundError extends LicenceVerifierError {
  constructor() {
    super('Licence not found', 404)
    this.name = 'LicenceNotFoundError'
  }
}

export class LicenceInactiveError extends LicenceVerifierError {
  constructor(message: string) {
    super(message, 422)
    this.name = 'LicenceInactiveError'
  }
}

export class LicenceExpiredError extends LicenceVerifierError {
  constructor() {
    super('Licence has expired', 422)
    this.name = 'LicenceExpiredError'
  }
}

export class ActivationLimitReachedError extends LicenceVerifierError {
  constructor(message: string) {
    super(message, 422)
    this.name = 'ActivationLimitReachedError'
  }
}

export class DomainAlreadyActiveError extends LicenceVerifierError {
  constructor(message: string) {
    super(message, 409)
    this.name = 'DomainAlreadyActiveError'
  }
}
