# Landing — Animated Usage Demo Section

**Date:** 2026-06-21
**Status:** Approved (design)
**Area:** `web/` (Vue 3 landing page)

## Goal

Add an **auto-playing animated "live demo"** section to the public landing page
(`web/src/views/LandingView.vue`) that shows, in an easy-to-understand and visually
engaging way, how the product is used end-to-end: paste a long URL → shorten →
copy the short link → view analytics.

The existing static **"How it works" (วิธีใช้งาน) 3-step** section stays as-is. The new
section complements it by *showing* the flow in motion rather than describing it.

## Placement

Page order becomes:

```
Hero → Stats → Features → How it works (3 steps) → ★ Usage Demo (new) → API → CTA
```

Inserted **after** the 3-step "How it works" section and **before** the API section.

## Approach (chosen)

**CSS + Vue state machine, no new dependencies.** A self-contained component renders a
mock "browser window" card (reusing the traffic-light + URL-bar chrome aesthetic already
used by the Hero demo card). A small state machine advances `currentScene` (0 → 1 → 2 →
loop) on a timer; CSS transitions/animations produce the motion. This keeps the section
theme-aware (dark/light), i18n-aware, and consistent with the existing landing style.

Rejected: animation libraries (GSAP / @vueuse/motion) — extra dependency, against the
project's minimal-ESM ethos; Lottie/video — needs design assets, not theme- or i18n-aware.

## Components & structure

- **New component:** `web/src/components/UsageDemo.vue` (flat in `components/`, matching the
  existing layout). Encapsulates the scene state machine, timer, and all demo markup/styles.
- **LandingView.vue** mounts `<UsageDemo :active="demoVisible" />` in the new section slot and
  drives `demoVisible` from its **existing** `IntersectionObserver` pattern (add `demoRef` +
  `demoVisible` alongside `statsRef`/`featuresRef`/etc., and the `section-visible` reveal wrapper
  for entrance consistency).
- The `:active` prop tells the component when the section is on-screen so the loop only runs
  while visible (starts on first view, can pause when scrolled away).

## Scenes (loop of 3, mapped to real usage)

1. **Paste & Shorten** — a long URL types into the input with a blinking caret; a custom-code
   field fills in `my-link`; the "ย่อ URL / Shorten" button does a press animation.
2. **Get Short Link** — a result row slides in showing `blly.to/my-link`; a Copy button is
   pressed → a "คัดลอกแล้ว! / Copied!" toast appears.
3. **View Analytics** — the card switches to a mini dashboard: a click counter animates up
   (0 → 1,248), a 7-bar timeline chart grows, and device/geo chips show (e.g. Mobile 64%, 🇹🇭 TH).

## Controls & behavior

- **Auto-loop** with a per-scene dwell (~3–4s), then advance; wraps 2 → 0.
- **Clickable step tabs** (`1 · 2 · 3` with step titles) synced to the active scene; clicking
  jumps to that scene and resets the dwell timer.
- A thin **progress bar** under the active tab counts down to the next scene.
- **Pause on hover/focus** of the card; resume on leave.
- Loop runs only while `:active` (section visible).

## Accessibility

- Honor `prefers-reduced-motion`: disable auto-advance and the typing/grow animations; present
  the three scenes as static end-states (tabs still switch on click). No essential information
  is conveyed by motion alone.
- Tabs are real buttons (keyboard-focusable); decorative chrome is `aria-hidden`.

## i18n

Add keys under `landing.*` in **both** `web/src/i18n/th.js` and `web/src/i18n/en.js`, mirroring
the existing structure. Indicative set (final names settled in implementation):

`demoSection`, `demoTitle`, `demoGradient`, `demoStep1Tab`, `demoStep1Title`, `demoStep2Tab`,
`demoStep2Title`, `demoStep3Tab`, `demoStep3Title`, `demoCustomCodePlaceholder`,
`demoShortenBtn`, `demoCopy`, `demoCopied`, `demoClicksLabel`, `demoDeviceLabel`, `demoGeoLabel`.

Static demo data (the sample long URL, `my-link`, `1,248`, chart bar heights, `Mobile 64%`,
`🇹🇭 TH`) is illustrative and lives in the component, not i18n.

## Out of scope

- No real shortening / network calls — purely illustrative.
- No backend changes; no changes to the management SPA.
- No new test framework. The landing has no FE tests by project convention.

## Verification

- `cd web && npm run build` succeeds (no Vue/Vite errors).
- Local dev (`web` dev server) visual check in light + dark, TH + EN: section appears after the
  3-step section, loops through all 3 scenes, tabs switch, hover pauses, reduced-motion shows
  static scenes.

## Landing the change (per CLAUDE.md)

- Bump root `package.json` version `1.1.0 → 1.2.0` (**minor** — new feature).
- Add a `CHANGELOG.md` entry (Keep a Changelog, newest on top).
- Merge branch into `main` locally; **user pushes** `main` (CI auto-deploys).
