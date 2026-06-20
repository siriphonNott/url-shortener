# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/); this project follows
[Semantic Versioning](https://semver.org/). The version tracks the **root `package.json`**
as the single project version — `api/` and `web/` `package.json` versions are independent build versions.

## [1.2.0] - 2026-06-21

### Added
- **Landing navbar Sign in + Sign up buttons** (`web/src/views/LandingView.vue`): the navbar now shows a secondary
  "Sign in" link (→ `/login`) and a prominent gradient "Sign up" button on the right (→ `/signup`), replacing the
  single "Login" button.

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
