// Human-facing HTML pages for broken short links (served on the apex by the redirect path).
// Self-contained: inline <style> + inline SVG, no external assets — works without the SPA/Tailwind runtime.
// Language is chosen server-side from Accept-Language (Thai for `th`, English otherwise), so the page ships static.

export type ErrorPageKind = 'not-found' | 'expired';

const STATUS: Record<ErrorPageKind, number> = { 'not-found': 404, expired: 410 };

const COPY = {
  th: {
    'not-found': {
      title: 'ไม่พบลิงก์นี้',
      sub: 'ลิงก์ที่คุณเปิดอาจถูกลบ หมดอายุ หรือไม่เคยมีอยู่จริง ลองตรวจสอบ URL อีกครั้ง',
    },
    expired: {
      title: 'ลิงก์นี้หมดอายุแล้ว',
      sub: 'ลิงก์ที่คุณเปิดหมดอายุและไม่สามารถใช้งานได้อีกต่อไป',
    },
    btn: 'กลับสู่หน้าแรก',
  },
  en: {
    'not-found': {
      title: 'Page not found',
      sub: 'The short link you followed may have been removed, expired, or never existed. Double-check the URL.',
    },
    expired: {
      title: 'This link has expired',
      sub: 'The short link you followed is no longer active and can’t be opened.',
    },
    btn: 'Back to homepage',
  },
} as const;

// The browser lists Accept-Language in preference order, so the first tag is the top preference.
// Thai only if the most-preferred language's primary subtag is `th`; everything else falls back to English.
function pickLang(acceptLanguage: string | null): 'th' | 'en' {
  const first = (acceptLanguage ?? '').split(',')[0]?.trim().toLowerCase() ?? '';
  return first.startsWith('th') ? 'th' : 'en';
}

export function renderErrorPage(kind: ErrorPageKind, acceptLanguage: string | null): string {
  const lang = pickLang(acceptLanguage);
  const t = COPY[lang][kind];
  const btn = COPY[lang].btn;
  const code = STATUS[kind];

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${code} · Blly.to</title>
<style>
:root{--bg:#f9fafb;--fg:#0f172a;--muted:#64748b;--card:rgba(255,255,255,.7);--border:rgba(226,232,240,.9);--blob1:rgba(96,165,250,.22);--blob2:rgba(167,139,250,.18);--blob3:rgba(103,232,249,.12);}
@media (prefers-color-scheme:dark){:root{--bg:#020617;--fg:#fff;--muted:#94a3b8;--card:rgba(15,23,42,.6);--border:rgba(51,65,85,.6);--blob1:rgba(37,99,235,.10);--blob2:rgba(124,58,237,.10);--blob3:rgba(34,211,238,.06);}}
*{box-sizing:border-box;}
body{margin:0;min-height:100vh;background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Thai",sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;position:relative;padding:24px;}
.blob{position:fixed;border-radius:9999px;filter:blur(96px);pointer-events:none;z-index:0;}
.b1{width:760px;height:760px;background:var(--blob1);top:0;right:0;transform:translate(33%,-33%);}
.b2{width:660px;height:660px;background:var(--blob2);bottom:0;left:0;transform:translate(-25%,33%);}
.b3{width:480px;height:480px;background:var(--blob3);top:50%;left:50%;transform:translate(-50%,-50%);}
.card{position:relative;z-index:10;width:100%;max-width:480px;text-align:center;background:var(--card);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:28px;padding:48px 36px 40px;box-shadow:0 24px 60px -20px rgba(2,6,23,.25);}
.accent{position:absolute;top:0;left:0;right:0;height:3px;border-radius:28px 28px 0 0;background:linear-gradient(90deg,#3b82f6,#8b5cf6,#2563eb);}
.logo{width:52px;height:52px;margin:0 auto 28px;border-radius:16px;background:linear-gradient(135deg,#3b82f6,#7c3aed);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px -6px rgba(59,130,246,.5);}
.logo svg{width:28px;height:28px;color:#fff;}
.code{font-size:84px;line-height:1;font-weight:800;letter-spacing:-.04em;margin:0 0 8px;background:linear-gradient(135deg,#2563eb,#7c3aed 60%,#3b82f6);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
h1{font-size:24px;font-weight:800;letter-spacing:-.02em;margin:0 0 12px;}
p{font-size:15px;line-height:1.6;color:var(--muted);margin:0 auto 32px;max-width:340px;}
.btn{display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:16px;background:linear-gradient(90deg,#2563eb,#7c3aed);box-shadow:0 12px 28px -8px rgba(59,130,246,.5);transition:transform .2s,box-shadow .2s;}
.btn:hover{transform:translateY(-2px);box-shadow:0 16px 34px -8px rgba(59,130,246,.6);}
.btn svg{width:18px;height:18px;}
.brand{position:relative;z-index:10;margin-top:28px;display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;font-weight:600;}
.brand-dot{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,#3b82f6,#7c3aed);display:flex;align-items:center;justify-content:center;}
.brand-dot svg{width:13px;height:13px;color:#fff;}
</style>
</head>
<body>
<div class="blob b1"></div>
<div class="blob b2"></div>
<div class="blob b3"></div>
<main class="card">
<div class="accent"></div>
<div class="logo"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg></div>
<div class="code">${code}</div>
<h1>${t.title}</h1>
<p>${t.sub}</p>
<a class="btn" href="/"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10"/></svg>${btn}</a>
</main>
<div class="brand"><span class="brand-dot"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg></span>Blly.to</div>
</body>
</html>`;
}

export function errorPageResponse(kind: ErrorPageKind, acceptLanguage: string | null): Response {
  return new Response(renderErrorPage(kind, acceptLanguage), {
    status: STATUS[kind],
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Don't let the edge cache a "not found yet" page — the code may be created later.
      'Cache-Control': 'no-store',
    },
  });
}
