import { fetchMock } from 'cloudflare:test';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { verifyTurnstile } from '../../src/lib/turnstile';

beforeAll(() => {
  fetchMock.activate();
  fetchMock
    .get('https://challenges.cloudflare.com')
    .intercept({ path: '/turnstile/v0/siteverify', method: 'POST' })
    .reply(200, (opts: any) => ({ success: !String(opts.body).includes('FAILME') }))
    .persist();
});
afterAll(() => fetchMock.deactivate());

describe('verifyTurnstile', () => {
  it('returns true when siteverify says success', async () => {
    expect(await verifyTurnstile('good-token', 'secret')).toBe(true);
  });
  it('returns false when siteverify says failure', async () => {
    expect(await verifyTurnstile('FAILME', 'secret')).toBe(false);
  });
  it('returns false without calling siteverify when token is empty', async () => {
    expect(await verifyTurnstile('', 'secret')).toBe(false);
    expect(await verifyTurnstile(undefined, 'secret')).toBe(false);
  });
});
