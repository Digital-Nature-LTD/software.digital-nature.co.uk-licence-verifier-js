export { LicenceVerifier } from './client.js'
export {
  LicenceVerifierError,
  LicenceNotFoundError,
  LicenceInactiveError,
  LicenceExpiredError,
  ActivationLimitReachedError,
  DomainAlreadyActiveError,
} from './errors.js'
export type {
  LicenceVerifierOptions,
  VerifyResult,
  ActivateResult,
  DeactivateResult,
  InfoResult,
  UpdateResult,
  LicenceDomain,
} from './types.js'
