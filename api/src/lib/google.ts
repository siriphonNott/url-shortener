import { jwtVerify, createRemoteJWKSet } from 'jose';

const GOOGLE_CERTS = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export type GoogleClaims = { sub: string; email: string; name: string; emailVerified: boolean };

// Lazily created so the JWKS is fetched on first verify (cached + refreshed by jose).
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
const getJwks = () => (jwks ??= createRemoteJWKSet(new URL(GOOGLE_CERTS)));

// Verify a Google Identity Services ID token. Throws on any failure (bad signature,
// wrong issuer/audience, expired, missing/unverified email). Caller maps to AUTH_GOOGLE_INVALID.
export async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleClaims> {
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID not configured');
  const { payload } = await jwtVerify(idToken, getJwks(), { issuer: ISSUERS, audience: clientId });
  const sub = payload.sub as string | undefined;
  const email = (payload.email as string | undefined)?.toLowerCase();
  const emailVerified = payload.email_verified === true;
  if (!sub || !email) throw new Error('google token missing sub/email');
  if (!emailVerified) throw new Error('google email not verified');
  return { sub, email, name: (payload.name as string | undefined) ?? '', emailVerified };
}
