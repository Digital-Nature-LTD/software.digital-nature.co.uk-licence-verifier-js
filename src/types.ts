export interface LicenceVerifierOptions {
  baseUrl: string
  /** Cache TTL in milliseconds. Applies to verify and info responses. Default: 30000. Set to 0 to disable. */
  cacheTtl?: number
  /** Override the fetch implementation. Useful for testing. */
  fetch?: typeof globalThis.fetch
}

export interface VerifyResult {
  valid: boolean
  licenceKey: string
  productSlug: string
  status: string
  expiresAt: string | null
}

export interface ActivateResult {
  activated: boolean
  domain: string
  domainType: 'production' | 'development'
  activationsUsed: number
  activationLimit: number | null
}

export interface DeactivateResult {
  deactivated: boolean
  domain: string
}

export interface LicenceDomain {
  domain: string
  domainType: 'production' | 'development'
  activatedAt: string
}

export interface InfoResult {
  licenceKey: string
  productSlug: string
  status: string
  expiresAt: string | null
  activationLimit: number | null
  activationsUsed: number
  domains: LicenceDomain[]
}

// Raw API response shapes (snake_case from server)
export interface RawVerifyResponse {
  valid: boolean
  licence_key: string
  product_slug: string
  status: string
  expires_at: string | null
}

export interface RawActivateResponse {
  activated: boolean
  domain: string
  domain_type: 'production' | 'development'
  activations_used: number
  activation_limit: number | null
}

export interface RawDeactivateResponse {
  deactivated: boolean
  domain: string
}

export interface RawDomain {
  domain: string
  domain_type: 'production' | 'development'
  activated_at: string
}

export interface RawInfoResponse {
  licence_key: string
  product_slug: string
  status: string
  expires_at: string | null
  activation_limit: number | null
  activations_used: number
  domains: RawDomain[]
}
