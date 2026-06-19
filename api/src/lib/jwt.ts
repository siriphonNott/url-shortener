import { SignJWT, jwtVerify } from 'jose';
import type { AuthUser } from '../env';

const enc = new TextEncoder();

export async function signToken(id: string, secret: string): Promise<string> {
  // Pin iat so exp - iat === exactly 7 days (setIssuedAt() + setExpirationTime('7d')
  // capture "now" separately and can differ by 1s, making the expiry test flaky).
  const iat = Math.floor(Date.now() / 1000);
  return new SignJWT({ id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setExpirationTime(iat + 7 * 24 * 60 * 60)
    .sign(enc.encode(secret));
}

export async function verifyToken(token: string, secret: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, enc.encode(secret));
  return { id: payload.id as string, iat: payload.iat, exp: payload.exp };
}
