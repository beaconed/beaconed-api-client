# @beaconed/api-client

TypeScript client for the Beaconed v1 API. Handles auth, typed error classes, automatic `Retry-After` respect, and async pagination — so callers never need to manage raw HTTP. Used by `@beaconed/mcp` and `@beaconed/cli`.

## Install

```bash
npm install @beaconed/api-client
pnpm add @beaconed/api-client
yarn add @beaconed/api-client
```

## Quickstart

```typescript
import { BeaconedClient } from '@beaconed/api-client';

const client = new BeaconedClient({ apiKey: process.env.BEACONED_API_KEY! });

// Fetch one product
const product = await client.products.get('abc-123');
console.log(product.title, product.readiness_score);

// Paginate
const page = await client.products.list({ page: 1, perPage: 50 });
console.log(page.data.length, page.pageInfo.total);
```

Get your API key at [beaconed.ai](https://beaconed.ai) under Settings > API Keys.

## Automatic retries

By default, the client retries HTTP 429 and 5xx responses once, including responses to writes. Network errors are not retried. For callers that must not repeat a potentially billable or state-changing request, disable retries for that client:

```typescript
const client = new BeaconedClient({
  apiKey: process.env.BEACONED_API_KEY!,
  retry: false,
});
```

With `retry: false`, the first failed response raises the usual typed error immediately. A failed response does not prove that the server performed no work; inspect the operation's state before deciding whether to try again.

## API coverage

- **Products** — list, get, create, update, sync, optimize, calculate-score, score history, optimizations
- **Optimizations** — list, get, approve, reject, apply, revert
- **Bulk Optimizations** — queue optimization for multiple products in one call
- **Scores** — list, latest
- **Settings** — get account optimization settings
- **Webhooks** — list, get, create, update, delete, test, event catalog

## Error handling

All errors extend `BeaconedError`. Import and catch what you need:

```typescript
import {
  BeaconedClient,
  BeaconedNotFoundError,
  BeaconedValidationError,
  BeaconedRateLimitError,
} from '@beaconed/api-client';

try {
  const product = await client.products.get('bad-id');
} catch (err) {
  if (err instanceof BeaconedNotFoundError) {
    console.error('not found');
  } else if (err instanceof BeaconedValidationError) {
    console.error('validation errors:', err.validationErrors);
  } else if (err instanceof BeaconedRateLimitError) {
    console.error(`rate limited, retry after ${err.retryAfterSeconds}s`);
  } else {
    throw err;
  }
}
```

| Class | HTTP status |
|-------|------------|
| `BeaconedAuthError` | 401 |
| `BeaconedForbiddenError` | 403 |
| `BeaconedNotFoundError` | 404 |
| `BeaconedValidationError` | 422 |
| `BeaconedRateLimitError` | 429 |
| `BeaconedServerError` | 5xx |
| `BeaconedNetworkError` | network failure |

## API docs

[https://beaconed.ai/api/docs](https://beaconed.ai/api/docs)

## License

MIT — see [LICENSE](LICENSE).
