const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Verify a Turnstile token against Cloudflare siteverify. Returns false (never throws)
// on an empty token, a non-OK response, or a network error.
export async function verifyTurnstile(
  token: string | null | undefined,
  secret: string,
  remoteip?: string,
): Promise<boolean> {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteip) body.set('remoteip', remoteip);
  try {
    const res = await fetch(SITEVERIFY, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
