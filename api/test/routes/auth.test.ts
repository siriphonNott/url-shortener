import { env, fetchMock } from 'cloudflare:test';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import app from '../../src/app';

const GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
let googlePriv: CryptoKey;

const signGoogle = (claims: Record<string, unknown>, aud = GOOGLE_CLIENT_ID) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setIssuer('https://accounts.google.com')
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(googlePriv);

beforeAll(async () => {
  (env as any).JWT_SECRET = 'sec';
  (env as any).TURNSTILE_SECRET_KEY = 'test-turnstile-secret';
  (env as any).GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;

  // Outbound fetch mocks (offline). Turnstile siteverify branches on the token body;
  // a token containing "FAILME" yields success:false.
  fetchMock.activate();
  fetchMock
    .get('https://challenges.cloudflare.com')
    .intercept({ path: '/turnstile/v0/siteverify', method: 'POST' })
    .reply(200, (opts: any) => ({ success: !String(opts.body).includes('FAILME') }))
    .persist();

  const { publicKey, privateKey } = await generateKeyPair('RS256');
  googlePriv = privateKey;
  const jwk = await exportJWK(publicKey);
  (jwk as any).kid = 'test-kid'; (jwk as any).alg = 'RS256'; (jwk as any).use = 'sig';
  fetchMock
    .get('https://www.googleapis.com')
    .intercept({ path: '/oauth2/v3/certs', method: 'GET' })
    .reply(200, { keys: [jwk] })
    .persist();

  // Pre-seed a password account to test Google account-linking by email.
  await env.DB.prepare(
    "INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('seed-link','link@gmail.com','hash','Link User','free','active','x','x')",
  ).run();
});
afterAll(() => fetchMock.deactivate());

const json = (body: any, headers: any = {}) => ({ method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const reg = (body: any) => json({ turnstileToken: 'ok-token', ...body });

describe('auth register (Turnstile-gated)', () => {
  it('register returns token + user (201) and hashes password', async () => {
    const res = await app.request('/api/v1/auth/register', reg({ email: 'New@X.com', password: 'pw123456' }), env);
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe('string');
    expect(body.user.email).toBe('new@x.com');
    expect(body.user).not.toHaveProperty('password');
  });
  it('register with duplicate email → AUTH_EMAIL_EXISTS', async () => {
    await app.request('/api/v1/auth/register', reg({ email: 'dup@x.com', password: 'pw123456' }), env);
    const res = await app.request('/api/v1/auth/register', reg({ email: 'dup@x.com', password: 'pw123456' }), env);
    expect(res.status).toBe(400);
    expect((await res.json() as any).errorCode).toBe('AUTH_EMAIL_EXISTS');
  });
  it('register missing fields → AUTH_MISSING_FIELDS', async () => {
    const res = await app.request('/api/v1/auth/register', reg({ email: 'x@x.com' }), env);
    expect((await res.json() as any).errorCode).toBe('AUTH_MISSING_FIELDS');
  });
  it('register weak password → AUTH_WEAK_PASSWORD', async () => {
    const res = await app.request('/api/v1/auth/register', reg({ email: 'weak@x.com', password: 'abc' }), env);
    expect(res.status).toBe(400);
    expect((await res.json() as any).errorCode).toBe('AUTH_WEAK_PASSWORD');
  });
  it('register failing Turnstile → AUTH_TURNSTILE_FAILED', async () => {
    const res = await app.request('/api/v1/auth/register', json({ email: 'bot@x.com', password: 'pw123456', turnstileToken: 'FAILME' }), env);
    expect(res.status).toBe(400);
    expect((await res.json() as any).errorCode).toBe('AUTH_TURNSTILE_FAILED');
  });
  it('register missing Turnstile token → AUTH_TURNSTILE_FAILED', async () => {
    const res = await app.request('/api/v1/auth/register', json({ email: 'notoken@x.com', password: 'pw123456' }), env);
    expect((await res.json() as any).errorCode).toBe('AUTH_TURNSTILE_FAILED');
  });
  it('null JSON body is handled (flat envelope, not 500)', async () => {
    const res = await app.request('/api/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'null' }, env);
    const b = await res.json() as any;
    expect(res.status).toBe(400);
    expect(b.success).toBe(false);
    expect(b.errorCode).toBe('AUTH_MISSING_FIELDS');
  });
});

describe('auth login', () => {
  it('login with correct creds returns token', async () => {
    await app.request('/api/v1/auth/register', reg({ email: 'log@x.com', password: 'pw123456' }), env);
    const res = await app.request('/api/v1/auth/login', json({ email: 'log@x.com', password: 'pw123456' }), env);
    expect(res.status).toBe(200);
    expect((await res.json() as any).token).toBeTruthy();
  });
  it('login wrong password → AUTH_INVALID_CREDENTIALS', async () => {
    await app.request('/api/v1/auth/register', reg({ email: 'log2@x.com', password: 'pw123456' }), env);
    const res = await app.request('/api/v1/auth/login', json({ email: 'log2@x.com', password: 'nope' }), env);
    expect((await res.json() as any).errorCode).toBe('AUTH_INVALID_CREDENTIALS');
  });
});

describe('auth api-key (unchanged)', () => {
  it('regenerate then getApiKey returns prefix only (no full key)', async () => {
    const regd = await app.request('/api/v1/auth/register', reg({ email: 'key@x.com', password: 'pw123456' }), env);
    const token = (await regd.json() as any).token;
    const gen = await app.request('/api/v1/auth/api-key/regenerate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }, env);
    const genBody = await gen.json() as any;
    expect(genBody.apiKey).toMatch(/^ak_live_[A-Za-z0-9]{40}$/);
    const get = await app.request('/api/v1/auth/api-key', { headers: { Authorization: `Bearer ${token}` } }, env);
    const getBody = await get.json() as any;
    expect(getBody.hasKey).toBe(true);
    expect(getBody.keyPrefix).toBe(genBody.keyPrefix);
    expect(getBody).not.toHaveProperty('apiKey');
  });
});

describe('auth google', () => {
  it('creates a new user (201) with google_sub', async () => {
    const tok = await signGoogle({ sub: 'new-sub', email: 'fresh@gmail.com', email_verified: true, name: 'Fresh' });
    const res = await app.request('/api/v1/auth/google', json({ idToken: tok }), env);
    expect(res.status).toBe(201);
    const b = await res.json() as any;
    expect(b.token).toBeTruthy();
    expect(b.user.email).toBe('fresh@gmail.com');
    const row = await env.DB.prepare("SELECT google_sub, password FROM users WHERE email='fresh@gmail.com'").first() as any;
    expect(row.google_sub).toBe('new-sub');
    expect(row.password).toBe('');
  });
  it('links onto an existing email account (200, same id)', async () => {
    const tok = await signGoogle({ sub: 'link-sub', email: 'link@gmail.com', email_verified: true, name: 'From Google' });
    const res = await app.request('/api/v1/auth/google', json({ idToken: tok }), env);
    expect(res.status).toBe(200);
    const b = await res.json() as any;
    expect(b.user.id).toBe('seed-link');
    const row = await env.DB.prepare("SELECT google_sub FROM users WHERE id='seed-link'").first() as any;
    expect(row.google_sub).toBe('link-sub');
  });
  it('rejects an invalid token → AUTH_GOOGLE_INVALID', async () => {
    const res = await app.request('/api/v1/auth/google', json({ idToken: 'garbage' }), env);
    expect(res.status).toBe(401);
    expect((await res.json() as any).errorCode).toBe('AUTH_GOOGLE_INVALID');
  });
});
