export interface LicenceVerifierOptions {
  baseUrl: string
  /** Cache TTL in milliseconds. Applies to verify and info responses. Default: 30000. Set to 0 to disable. */
  cacheTtl?: number
  /** Override the fetch implementation. Useful for testing. */
  fetch?: typeof globalThis.fetch
}

/** One add-on held on a free trial. */
export interface TrialGrant {
  /** The add-on slug, as it appears in `addons`. */
  addon: string
  /** ISO 8601. From this moment the add-on is no longer granted. */
  endsAt: string
}

export interface VerifyResult {
  valid: boolean
  licenceKey: string
  productSlug: string
  status: string
  expiresAt: string | null
  /**
   * The package this licence is on, or null for an ordinary product.
   *
   * Added when packages arrived. An older server, or a product sold before
   * packages existed, omits it — so it arrives `undefined` and is normalised to
   * `null` rather than being left to read as "no answer".
   */
  package: string | null
  /**
   * Every add-on the licence grants — those included in its package and those
   * bought separately, deduped. `[]` for an ordinary product.
   */
  addons: string[]
  /**
   * Which of `addons` are held on a FREE TRIAL, and when each stops granting.
   * `[]` when none.
   *
   * Added with free trials. `addons` already leaves out a trial that has ended,
   * so a consumer that ignores this still enforces the end; read it to show
   * "N days left". An older server omits it, normalised to `[]`.
   */
  trials: TrialGrant[]
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
  /**
   * The package this licence is on, or null for an ordinary product.
   *
   * Added when packages arrived. An older server, or a product sold before
   * packages existed, omits it — so it arrives `undefined` and is normalised to
   * `null` rather than being left to read as "no answer".
   */
  package: string | null
  /**
   * Every add-on the licence grants — those included in its package and those
   * bought separately, deduped. `[]` for an ordinary product.
   */
  addons: string[]
  /**
   * Which of `addons` are held on a FREE TRIAL, and when each stops granting.
   * `[]` when none.
   *
   * Added with free trials. `addons` already leaves out a trial that has ended,
   * so a consumer that ignores this still enforces the end; read it to show
   * "N days left". An older server omits it, normalised to `[]`.
   */
  trials: TrialGrant[]
}

export interface UpdateResult {
  updateAvailable: boolean
  latestVersion: string | null
  downloadToken: string | null
  /** Pre-constructed download URL. Pass directly to WordPress's package field or trigger a download. Valid for 5 minutes. */
  downloadUrl: string | null
}

// Raw API response shapes (snake_case from server)
export interface RawVerifyResponse {
  valid: boolean
  licence_key: string
  product_slug: string
  status: string
  expires_at: string | null
  /** Optional: absent from servers older than packages. */
  package?: string | null
  addons?: string[]
  /** Optional: absent from servers older than free trials. */
  trials?: RawTrialGrant[]
}

export interface RawTrialGrant {
  addon: string
  ends_at: string
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

export interface RawUpdateResponse {
  update_available: boolean
  latest_version: string | null
  download_token: string | null
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
  /** Optional: absent from servers older than packages. */
  package?: string | null
  addons?: string[]
  /** Optional: absent from servers older than free trials. */
  trials?: RawTrialGrant[]
}
