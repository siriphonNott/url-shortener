import app from './app';
import { handleRedirect } from './controllers/redirectController';
import type { Env } from './env';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const host = url.hostname;

    // API host → Hono
    if (host.startsWith('api.')) return app.fetch(request, env, ctx);

    // Apex/short host: try static assets first; if none, treat as a code redirect
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes.status !== 404) return assetRes;

    // Non-asset path on the apex:
    if (url.pathname === '/' || url.pathname === '') return assetRes; // landing 404 fallthrough
    return handleRedirect(request, env, ctx);
  },
};
