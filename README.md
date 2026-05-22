# @digital-nature/licence-verifier

JavaScript/TypeScript client for the [Digital Nature](https://digital-nature.co.uk) licence verification API.

## Installation

```bash
npm install @digital-nature/licence-verifier
```

## Usage

```ts
import { LicenceVerifier } from '@digital-nature/licence-verifier'

const verifier = new LicenceVerifier({
  baseUrl: 'https://verify.software.digital-nature.co.uk',
})

// Check a licence is valid
const result = await verifier.verify('XXXX-XXXX-XXXX-XXXX')
// { valid: true, licenceKey: '...', productSlug: '...', status: 'active', expiresAt: null }

// Activate a domain
const activation = await verifier.activate('XXXX-XXXX-XXXX-XXXX', 'example.com')
// { activated: true, domain: 'example.com', domainType: 'production', activationsUsed: 1, activationLimit: 2 }

// Deactivate a domain
await verifier.deactivate('XXXX-XXXX-XXXX-XXXX', 'example.com')

// Get full licence info
const info = await verifier.info('XXXX-XXXX-XXXX-XXXX')
// { licenceKey: '...', productSlug: '...', status: 'active', activationsUsed: 1, activationLimit: 2, domains: [...] }
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | — | Base URL of the verify service |
| `cacheTtl` | `number` | `30000` | Cache TTL in ms for `verify` and `info` responses. Set to `0` to disable. |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Override the fetch implementation (useful for testing) |

## Error handling

All methods throw typed errors you can `instanceof` check:

```ts
import {
  LicenceNotFoundError,
  LicenceExpiredError,
  LicenceInactiveError,
  ActivationLimitReachedError,
  DomainAlreadyActiveError,
  LicenceVerifierError,  // base class
} from '@digital-nature/licence-verifier'

try {
  await verifier.activate(key, domain)
} catch (err) {
  if (err instanceof ActivationLimitReachedError) {
    // handle limit
  } else if (err instanceof LicenceNotFoundError) {
    // handle not found
  }
}
```

## Requirements

Node.js 18 or later (uses native `fetch`).
