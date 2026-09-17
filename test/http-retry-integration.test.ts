import { createServer } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { describe, it, expect } from 'vitest';
import { BeaconedClient } from '../src/client.js';
import { BeaconedRateLimitError, BeaconedServerError } from '../src/errors.js';

describe('HTTP retry configuration', () => {
  it.each([429, 503])(
    'does not repeat a paid POST after %i when retries are disabled',
    async (status) => {
      const requests: Array<{ method: string | undefined; url: string | undefined }> = [];
      const server = createServer((req, res) => {
        requests.push({ method: req.method, url: req.url });
        req.resume();
        res.writeHead(status, { 'Content-Type': 'application/json', 'Retry-After': '0' });
        res.end(JSON.stringify({ success: false, error: 'Please try later', errors: [] }));
      });
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      try {
        const client = new BeaconedClient({
          apiKey: 'test-key',
          baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
          retry: false,
        });
        const result = client.products.optimize('product-1', { fields: ['title'] });
        await expect(result).rejects.toBeInstanceOf(
          status === 429 ? BeaconedRateLimitError : BeaconedServerError,
        );
        await expect(result).rejects.toMatchObject({ status, requestMethod: 'POST' });
        expect(requests).toEqual([
          { method: 'POST', url: '/api/v1/products/product-1/optimization' },
        ]);
      } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
  );

  it.each([429, 503])('retains the default retry after %i', async (status) => {
    let requests = 0;
    const server = createServer((req, res) => {
      requests += 1;
      req.resume();
      res.writeHead(requests === 1 ? status : 202, {
        'Content-Type': 'application/json',
        'Retry-After': '0',
      });
      res.end(
        JSON.stringify(requests === 1 ? { error: 'Please try later' } : { data: { queued: true } }),
      );
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const client = new BeaconedClient({
        apiKey: 'test-key',
        baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      });
      await expect(client.products.optimize('product-1', { fields: ['title'] })).resolves.toEqual({
        queued: true,
      });
      expect(requests).toBe(2);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
