import type {
  LicenceVerifierOptions,
  VerifyResult, ActivateResult, DeactivateResult, InfoResult, UpdateResult,
  RawVerifyResponse, RawActivateResponse, RawDeactivateResponse, RawInfoResponse, RawUpdateResponse,
} from './types.js'
import {
  LicenceVerifierError, LicenceNotFoundError, LicenceInactiveError,
  LicenceExpiredError, ActivationLimitReachedError, DomainAlreadyActiveError,
} from './errors.js'

const DEFAULT_CACHE_TTL = 30_000

interface CacheEntry { value: unknown; expiresAt: number }

export class LicenceVerifier {
  private readonly baseUrl: string
  private readonly cacheTtl: number
  private readonly fetchFn: typeof globalThis.fetch
  private readonly cache = new Map<string, CacheEntry>()

  constructor(options: LicenceVerifierOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.cacheTtl = options.cacheTtl ?? DEFAULT_CACHE_TTL
    this.fetchFn = options.fetch ?? globalThis.fetch
  }

  private getCache<T>(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) { this.cache.delete(key); return undefined }
    return entry.value as T
  }

  private setCache(key: string, value: unknown): void {
    if (this.cacheTtl > 0) {
      this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtl })
    }
  }

  private invalidate(...keys: string[]): void {
    keys.forEach(k => this.cache.delete(k))
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>): Promise<T> {
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json() as Record<string, unknown>
    if (!res.ok) this.throwError(res.status, data)
    return data as T
  }

  private throwError(status: number, data: Record<string, unknown>): never {
    const msg = typeof data.error === 'string' ? data.error : 'Unknown error'
    if (status === 404) throw new LicenceNotFoundError()
    if (status === 409) throw new DomainAlreadyActiveError(msg)
    if (status === 422) {
      if (/expired/i.test(msg)) throw new LicenceExpiredError()
      if (/limit/i.test(msg)) throw new ActivationLimitReachedError(msg)
      throw new LicenceInactiveError(msg)
    }
    throw new LicenceVerifierError(msg, status)
  }

  async verify(licenceKey: string): Promise<VerifyResult> {
    const cacheKey = `verify:${licenceKey}`
    const cached = this.getCache<VerifyResult>(cacheKey)
    if (cached) return cached

    const raw = await this.request<RawVerifyResponse>('POST', '/verify', { licence_key: licenceKey })
    const result: VerifyResult = {
      valid: raw.valid,
      licenceKey: raw.licence_key,
      productSlug: raw.product_slug,
      status: raw.status,
      expiresAt: raw.expires_at,
    }
    this.setCache(cacheKey, result)
    return result
  }

  async activate(licenceKey: string, domain: string): Promise<ActivateResult> {
    const raw = await this.request<RawActivateResponse>('POST', '/activate', { licence_key: licenceKey, domain })
    this.invalidate(`verify:${licenceKey}`, `info:${licenceKey}`)
    return {
      activated: raw.activated,
      domain: raw.domain,
      domainType: raw.domain_type,
      activationsUsed: raw.activations_used,
      activationLimit: raw.activation_limit,
    }
  }

  async deactivate(licenceKey: string, domain: string): Promise<DeactivateResult> {
    const raw = await this.request<RawDeactivateResponse>('POST', '/deactivate', { licence_key: licenceKey, domain })
    this.invalidate(`verify:${licenceKey}`, `info:${licenceKey}`)
    return { deactivated: raw.deactivated, domain: raw.domain }
  }

  async checkForUpdate(licenceKey: string, currentVersion?: string): Promise<UpdateResult> {
    const qs = `licence_key=${encodeURIComponent(licenceKey)}${currentVersion ? `&current_version=${encodeURIComponent(currentVersion)}` : ''}`
    const raw = await this.request<RawUpdateResponse>('GET', `/update?${qs}`)
    const downloadUrl = raw.download_token
      ? `${this.baseUrl}/download?token=${encodeURIComponent(raw.download_token)}`
      : null
    return {
      updateAvailable: raw.update_available,
      latestVersion: raw.latest_version,
      downloadToken: raw.download_token,
      downloadUrl,
    }
  }

  async info(licenceKey: string): Promise<InfoResult> {
    const cacheKey = `info:${licenceKey}`
    const cached = this.getCache<InfoResult>(cacheKey)
    if (cached) return cached

    const raw = await this.request<RawInfoResponse>('GET', `/info?licence_key=${encodeURIComponent(licenceKey)}`)
    const result: InfoResult = {
      licenceKey: raw.licence_key,
      productSlug: raw.product_slug,
      status: raw.status,
      expiresAt: raw.expires_at,
      activationLimit: raw.activation_limit,
      activationsUsed: raw.activations_used,
      domains: raw.domains.map(d => ({
        domain: d.domain,
        domainType: d.domain_type,
        activatedAt: d.activated_at,
      })),
    }
    this.setCache(cacheKey, result)
    return result
  }
}
