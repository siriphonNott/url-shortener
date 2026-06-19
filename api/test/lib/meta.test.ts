import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchPageMeta } from '../../src/lib/meta';

afterEach(() => vi.restoreAllMocks());

const html = `<html><head>
  <meta property="og:title" content="Hello &amp; World"/>
  <meta name="description" content="A description"/>
  <title>Fallback</title></head></html>`;

describe('fetchPageMeta', () => {
  it('extracts og:title (entity-decoded) and description', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(html, { status: 200 })));
    const meta = await fetchPageMeta('https://example.com');
    expect(meta.title).toBe('Hello & World');
    expect(meta.description).toBe('A description');
  });
  it('returns empty on network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('net'); }));
    expect(await fetchPageMeta('https://example.com')).toEqual({ title: '', description: '' });
  });
});
