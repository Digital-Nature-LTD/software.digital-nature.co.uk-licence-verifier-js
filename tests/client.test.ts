import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { LicenceVerifier } from '../src/index.js'
import {
  LicenceNotFoundError, LicenceExpiredError, LicenceInactiveError,
  ActivationLimitReachedError, DomainAlreadyActiveError,
} from '../src/errors.js'

function makeFetch(status: number, body: unknown): typeof globalThis.fetch {
  return async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeClient(status: number, body: unknown, cacheTtl = 0) {
  return new LicenceVerifier({
    baseUrl: 'https://verify.example.com',
    cacheTtl,
    fetch: makeFetch(status, body),
  })
}

// ─── verify ──────────────────────────────────────────────────────────────────

describe('verify', () => {
  it('returns a camelCase result for a valid licence', async () => {
    const client = makeClient(200, {
      valid: true, licence_key: 'ABC-123', product_slug: 'my-plugin',
      status: 'active', expires_at: null,
    })
    const result = await client.verify('ABC-123')
    assert.equal(result.valid, true)
    assert.equal(result.licenceKey, 'ABC-123')
    assert.equal(result.productSlug, 'my-plugin')
    assert.equal(result.status, 'active')
    assert.equal(result.expiresAt, null)
  })

  it('throws LicenceNotFoundError on 404', async () => {
    const client = makeClient(404, { error: 'Licence not found' })
    await assert.rejects(() => client.verify('BAD'), LicenceNotFoundError)
  })

  it('throws LicenceExpiredError on 422 expired', async () => {
    const client = makeClient(422, { error: 'Licence has expired' })
    await assert.rejects(() => client.verify('KEY'), LicenceExpiredError)
  })

  it('throws LicenceInactiveError on 422 suspended', async () => {
    const client = makeClient(422, { error: 'Licence is suspended' })
    await assert.rejects(() => client.verify('KEY'), LicenceInactiveError)
  })
})

// ─── activate ────────────────────────────────────────────────────────────────

describe('activate', () => {
  it('returns a camelCase result on success', async () => {
    const client = makeClient(200, {
      activated: true, domain: 'example.com', domain_type: 'production',
      activations_used: 1, activation_limit: 2,
    })
    const result = await client.activate('KEY', 'example.com')
    assert.equal(result.activated, true)
    assert.equal(result.domainType, 'production')
    assert.equal(result.activationsUsed, 1)
    assert.equal(result.activationLimit, 2)
  })

  it('throws ActivationLimitReachedError on 422 limit', async () => {
    const client = makeClient(422, { error: 'Activation limit reached (2)' })
    await assert.rejects(() => client.activate('KEY', 'site3.com'), ActivationLimitReachedError)
  })

  it('throws DomainAlreadyActiveError on 409', async () => {
    const client = makeClient(409, { error: 'Domain already activated on this licence' })
    await assert.rejects(() => client.activate('KEY', 'example.com'), DomainAlreadyActiveError)
  })

  it('throws LicenceNotFoundError on 404', async () => {
    const client = makeClient(404, { error: 'Licence not found' })
    await assert.rejects(() => client.activate('BAD', 'example.com'), LicenceNotFoundError)
  })
})

// ─── deactivate ──────────────────────────────────────────────────────────────

describe('deactivate', () => {
  it('returns result on success', async () => {
    const client = makeClient(200, { deactivated: true, domain: 'example.com' })
    const result = await client.deactivate('KEY', 'example.com')
    assert.equal(result.deactivated, true)
    assert.equal(result.domain, 'example.com')
  })

  it('throws LicenceNotFoundError on 404', async () => {
    const client = makeClient(404, { error: 'Licence not found' })
    await assert.rejects(() => client.deactivate('BAD', 'example.com'), LicenceNotFoundError)
  })
})

// ─── info ─────────────────────────────────────────────────────────────────────

describe('info', () => {
  it('returns a camelCase result with mapped domains', async () => {
    const client = makeClient(200, {
      licence_key: 'ABC-123', product_slug: 'my-plugin', status: 'active',
      expires_at: null, activation_limit: 2, activations_used: 1,
      domains: [{ domain: 'example.com', domain_type: 'production', activated_at: '2026-01-01T00:00:00Z' }],
    })
    const result = await client.info('ABC-123')
    assert.equal(result.licenceKey, 'ABC-123')
    assert.equal(result.activationsUsed, 1)
    assert.equal(result.domains.length, 1)
    assert.equal(result.domains[0].domainType, 'production')
    assert.equal(result.domains[0].activatedAt, '2026-01-01T00:00:00Z')
  })

  it('throws LicenceNotFoundError on 404', async () => {
    const client = makeClient(404, { error: 'Licence not found' })
    await assert.rejects(() => client.info('BAD'), LicenceNotFoundError)
  })
})

// ─── checkForUpdate ──────────────────────────────────────────────────────────

describe('checkForUpdate', () => {
  it('returns a camelCase result when an update is available', async () => {
    const client = makeClient(200, {
      update_available: true, latest_version: '2.0.0', download_token: 'tok_abc123',
    })
    const result = await client.checkForUpdate('KEY')
    assert.equal(result.updateAvailable, true)
    assert.equal(result.latestVersion, '2.0.0')
    assert.equal(result.downloadToken, 'tok_abc123')
    assert.equal(result.downloadUrl, 'https://verify.example.com/download?token=tok_abc123')
  })

  it('returns updateAvailable: false with null tokens when no versions exist', async () => {
    const client = makeClient(200, {
      update_available: false, latest_version: null, download_token: null,
    })
    const result = await client.checkForUpdate('KEY')
    assert.equal(result.updateAvailable, false)
    assert.equal(result.latestVersion, null)
    assert.equal(result.downloadToken, null)
    assert.equal(result.downloadUrl, null)
  })

  it('sends current_version in the query string when provided', async () => {
    let capturedUrl = ''
    const fetchFn: typeof globalThis.fetch = async (input) => {
      capturedUrl = input.toString()
      return new Response(JSON.stringify({ update_available: false, latest_version: '1.0.0', download_token: null }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }
    const client = new LicenceVerifier({ baseUrl: 'https://verify.example.com', fetch: fetchFn })
    await client.checkForUpdate('KEY', '1.0.0')
    assert.ok(capturedUrl.includes('current_version=1.0.0'), `URL should include current_version, got: ${capturedUrl}`)
  })

  it('throws LicenceNotFoundError on 404', async () => {
    const client = makeClient(404, { error: 'Licence not found' })
    await assert.rejects(() => client.checkForUpdate('BAD'), LicenceNotFoundError)
  })

  it('throws LicenceInactiveError on 422', async () => {
    const client = makeClient(422, { error: 'Licence is suspended' })
    await assert.rejects(() => client.checkForUpdate('KEY'), LicenceInactiveError)
  })
})

// ─── caching ─────────────────────────────────────────────────────────────────

describe('caching', () => {
  it('verify serves cached result on second call', async () => {
    let calls = 0
    const fetchFn: typeof globalThis.fetch = async () => {
      calls++
      return new Response(JSON.stringify({
        valid: true, licence_key: 'KEY', product_slug: 'plugin', status: 'active', expires_at: null,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    const client = new LicenceVerifier({ baseUrl: 'https://verify.example.com', cacheTtl: 60_000, fetch: fetchFn })
    await client.verify('KEY')
    await client.verify('KEY')
    assert.equal(calls, 1)
  })

  it('activate invalidates the verify cache', async () => {
    let verifyResponse = { valid: true, licence_key: 'KEY', product_slug: 'plugin', status: 'active', expires_at: null }
    let calls = 0
    const fetchFn: typeof globalThis.fetch = async (input) => {
      const url = input.toString()
      if (new URL(url).pathname === '/verify') {
        calls++
        return new Response(JSON.stringify(verifyResponse), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({
        activated: true, domain: 'example.com', domain_type: 'production', activations_used: 1, activation_limit: 2,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    const client = new LicenceVerifier({ baseUrl: 'https://verify.example.com', cacheTtl: 60_000, fetch: fetchFn })
    await client.verify('KEY')       // call 1 — cached
    await client.activate('KEY', 'example.com')  // invalidates cache
    await client.verify('KEY')       // call 2 — must re-fetch
    assert.equal(calls, 2)
  })

  it('caching is disabled when cacheTtl is 0', async () => {
    let calls = 0
    const fetchFn: typeof globalThis.fetch = async () => {
      calls++
      return new Response(JSON.stringify({
        valid: true, licence_key: 'KEY', product_slug: 'plugin', status: 'active', expires_at: null,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    const client = new LicenceVerifier({ baseUrl: 'https://verify.example.com', cacheTtl: 0, fetch: fetchFn })
    await client.verify('KEY')
    await client.verify('KEY')
    assert.equal(calls, 2)
  })
})
