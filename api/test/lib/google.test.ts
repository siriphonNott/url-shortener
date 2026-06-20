import { fetchMock } from 'cloudflare:test';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { verifyGoogleIdToken } from '../../src/lib/google';

const CLIENT_ID = 'test-client.apps.googleusercontent.com';
let priv: CryptoKey;

const sign = (claims: Record<string, unknown>, aud = CLIENT_ID, iss = 'https://accounts.google.com') =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setIssuer(iss)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(priv);

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  priv = privateKey;
  const jwk = await exportJWK(publicKey);
  (jwk as any).kid = 'test-kid';
  (jwk as any).alg = 'RS256';
  (jwk as any).use = 'sig';
  fetchMock.activate();
  fetchMock
    .get('https://www.googleapis.com')
    .intercept({ path: '/oauth2/v3/certs', method: 'GET' })
    .reply(200, { keys: [jwk] })
    .persist();
});
afterAll(() => fetchMock.deactivate());

describe('verifyGoogleIdToken', () => {
  it('returns claims for a valid token', async () => {
    const tok = await sign({ sub: 'g-1', email: 'User@Gmail.com', email_verified: true, name: 'G User' });
    const claims = await verifyGoogleIdToken(tok, CLIENT_ID);
    expect(claims).toEqual({ sub: 'g-1', email: 'user@gmail.com', name: 'G User', emailVerified: true });
  });
  it('throws on wrong audience', async () => {
    const tok = await sign({ sub: 'g-2', email: 'a@gmail.com', email_verified: true }, 'other-client');
    await expect(verifyGoogleIdToken(tok, CLIENT_ID)).rejects.toThrow();
  });
  it('throws when email is unverified', async () => {
    const tok = await sign({ sub: 'g-3', email: 'b@gmail.com', email_verified: false, name: 'B' });
    await expect(verifyGoogleIdToken(tok, CLIENT_ID)).rejects.toThrow();
  });
  it('throws on a malformed token', async () => {
    await expect(verifyGoogleIdToken('not-a-jwt', CLIENT_ID)).rejects.toThrow();
  });
});
