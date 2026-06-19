const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomKeyBody(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(40));
  let s = '';
  for (let i = 0; i < 40; i++) s += CHARS[bytes[i] % CHARS.length];
  return s;
}

export async function hashKey(fullKey: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fullKey));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const keyPrefixOf = (fullKey: string): string => fullKey.slice(0, 14);

export async function generateKey() {
  const fullKey = `ak_live_${randomKeyBody()}`;
  return { fullKey, keyHash: await hashKey(fullKey), keyPrefix: keyPrefixOf(fullKey) };
}
