import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { ok, fail, ERRORS } from '../../src/lib/errorCodes';

const app = new Hono();
app.get('/ok', (c) => ok(c, { token: 't' }, 201));
app.get('/fail', (c) => fail(c, 'AUTH_NO_TOKEN'));

describe('errorCodes', () => {
  it('ok wraps data with success:true and status', async () => {
    const res = await app.request('/ok');
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ success: true, token: 't' });
  });
  it('fail returns the FLAT mapped envelope and status', async () => {
    const res = await app.request('/fail');
    expect(res.status).toBe(ERRORS.AUTH_NO_TOKEN.status);
    expect(await res.json()).toEqual({
      success: false,
      errorCode: 'AUTH_NO_TOKEN',
      message: ERRORS.AUTH_NO_TOKEN.message,
    });
  });
});
