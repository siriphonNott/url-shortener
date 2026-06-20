# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/); this project follows
[Semantic Versioning](https://semver.org/). The version tracks the **root `package.json`**
as the single project version — `api/` and `web/` `package.json` versions are independent build versions.

## [1.3.1] - 2026-06-21

### Changed
- **Landing CTA ("Ready to get started?") redesigned to be crisp and on-brand** (`web/src/views/LandingView.vue`):
  removed the hazy blur layers (the animated glow halo, the blurred top spotlight, the soft wash overlay, and the
  icon `backdrop-blur`) and rebuilt definition with hard-edged geometry — a hairline inner ring, a lit-from-above
  1px bevel, a single crisp top-edge highlight line, and a tight low-spread directional shadow (with a dark-mode
  shadow override so it seats on `slate-950`). Keeps the brand `blue-600 → violet-600` gradient, masked dot-grid
  texture, floating icon, and `.shine-btn` button; all motion is gated behind `prefers-reduced-motion`.
- **Footer version chip restyled** to match the hero badge: a blue brand pill (`v{x.y.z}`) instead of the gray chip.
- **Removed the leading dot** from the hero "URL Shortener & Analytics Platform" badge and the footer version chip.

## [1.3.0] - 2026-06-21

### Added
- **Animated "Live Demo" section on the landing page** (`web/src/components/UsageDemo.vue`, mounted in
  `LandingView.vue` after the "How it works" steps). An auto-playing, looping mock-UI walkthrough of real usage:
  paste & shorten → copy the short link → view analytics. Clickable step tabs (with a per-scene progress bar),
  pause-on-hover, and a `prefers-reduced-motion` fallback that shows static end-states. No new dependencies —
  pure CSS animations plus a `requestAnimationFrame` click counter; theme-aware (light/dark) and i18n-driven
  (new `landing.demo*` keys in both `th.js` and `en.js`).

## [1.2.0] - 2026-06-21

### Added
- **Landing navbar Sign in + Sign up buttons** (`web/src/views/LandingView.vue`): the navbar now shows a secondary
  "Sign in" link (→ `/login`) and a prominent gradient "Sign up" button on the right (→ `/signup`), replacing the
  single "Login" button.
- **App version on the landing footer**: the root `package.json` version is read at build time in `web/vite.config.js`
  and exposed via `import.meta.env.VITE_APP_VERSION`; the landing footer renders it as a `v{x.y.z}` pill next to the
  brand.

### Changed
- All "Get Started Free" CTAs route to **Sign up** (`/signup`). The bottom CTA button previously linked to `/login`;
  the hero CTA already pointed to signup.

## [1.1.0] - 2026-06-21

### Added
- **CI/CD pipeline** (`.github/workflows/deploy.yml`): on push to `main`, runs the api test suite, then (on green)
  builds web and deploys the SPA (`app.eraflow.dev`), refreshes the apex landing, and deploys the api Worker
  (`api.eraflow.dev` + `eraflow.dev`).
- Production env keys `VITE_TURNSTILE_SITE_KEY` + `VITE_GOOGLE_CLIENT_ID` in `web/.env.production`, so the CI build
  ships working Turnstile and Google sign-in.

### Changed
- Documented the working flow in `CLAUDE.md`: always work in a git worktree, no PRs, land on `main` (user pushes) →
  CI auto-deploys. Added this CHANGELOG + version-bump step to that flow.

### Removed
- Stopped tracking generated build output — `api/public/` is now gitignored (previously 25+ hashed asset files
  surfaced as git noise on every build).

## [1.0.0] - 2026-06-19

### Added
- Baseline: migration from Express/MongoDB (Vercel) to Cloudflare Workers + D1 (Hono + Drizzle). Backend complete
  (70/70 tests passing), live on the `eraflow.dev` zone.
