# Design System — JobFoocus

## Brand

JobFoocus is a warm, editorial job-search companion. The signature is a sunset gradient (orange → yellow → cream) that closes every page, paired with PP Editorial Old (near-serif) for hero displays and Inter (geometric sans) for everything else. Cream-yellow surfaces carry form panels; saturated orange carries CTAs; dark mode is warm-tinted (not pure black).

---

## Color Tokens

The single source of truth is `src/styles/globals.css` (`:root` for light, `.dark` for dark). Every visible color in the app maps to exactly one of these. The lint script (`npm run lint:theme`) enforces this.

### Surfaces

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas` | `#ffffff` | `#0e0f0c` | Page background |
| `--surface` | `#fafafa` | `#141512` | Card / panel background |
| `--surface-elevated` | `#f5f5f4` | `#1c1d1a` | Chip / hover / inset surface |
| `--input-bg` | `#ffffff` | `#1c1c1e` | Form input fill |
| `--scrim` | `rgba(30,25,20,0.55)` | `rgba(0,0,0,0.7)` | Modal backdrop |
| `--toggle-off` | `#d4d4d4` | `#3d3d3a` | Toggle off-state |

### Cream / Brand Warm

| Token | Light | Dark | Use |
|---|---|---|---|
| `--cream` | `#fff8e0` | `#181713` | Warm panel background |
| `--cream-light` | `#fffaeb` | `#1c1a15` | Lighter warm surface |
| `--cream-deeper` | `#fff0c2` | `#2a281f` | Warm chip / elevated surface |
| `--beige-deep` | `#e6d5a8` | `#2e2c21` | Warm border / brand accent |
| `--surface-cream` | `#fff8e0` | `#181713` | Alias for cream |
| `--surface-cream-soft` | `#fffaeb` | `#161511` | Lighter warm surface |
| `--footer-cream` | `#fff8e0` | `#141512` | Footer background |

### Text

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ink` | `#1f1f1f` | `#f5f5f4` | Primary text |
| `--ink-tint` | `#3d3d3d` | `#e7e5e4` | Softer primary |
| `--charcoal` | `#2c2c2c` | `#d6d3d1` | Body emphasis |
| `--slate` | `#4a4a4a` | `#a8a29e` | Secondary text |
| `--steel` | `#6a6a6a` | `#78716c` | Muted text / captions |
| `--stone` | `#8a8a8a` | `#57534e` | Disabled / placeholder |
| `--muted` | `#a8a8a8` | `#44403c` | Very muted / placeholder |

### Borders

| Token | Light | Dark | Use |
|---|---|---|---|
| `--hairline-soft` | `#ededed` | `#181916` | Subtle dividers |
| `--hairline` | `#e5e5e5` | `#1c1d1a` | Default borders |
| `--hairline-strong` | `#c7c7c7` | `#33352f` | Strong borders / inputs |

### Brand & Accent (intentionally stable across themes)

| Token | Value | Use |
|---|---|---|
| `--primary` | `#fa520f` | Brand orange / primary CTA |
| `--primary-deep` | `#cc3a05` | Pressed-state orange |
| `--on-primary` | `#ffffff` | Text on primary |
| `--on-dark` | `#ffffff` | Text on dark surfaces (always white) |
| `--on-dark-muted` | `#a8a8a8` | Muted text on dark (always muted) |
| `--link` | `#fa520f` | Inline link color |

### Sunset Gradient

| Token | Light | Dark |
|---|---|---|
| `--sunset-stripe` | `linear-gradient(to right, #fa520f, #ffa110, #ffb83e, #ffd900, #fff8e0)` | Same, ending in `#141512` |

### Info / Blue (PII indicators, info panels)

| Token | Light | Dark |
|---|---|---|
| `--info-bg` | `#eff6ff` | `#0f1729` |
| `--info-bg-strong` | `#dbeafe` | `#1a2a4a` |
| `--info-border` | `#bfdbfe` | `#1e3a5f` |
| `--info-border-strong` | `#60a5fa` | `#60a5fa` |
| `--info-text` | `#2563eb` | `#60a5fa` |
| `--info-text-strong` | `#1d4ed8` | `#93c5fd` |

### Danger / Red (delete buttons, errors)

| Token | Light | Dark |
|---|---|---|
| `--danger-bg` | `#fef2f2` | `#2d1215` |
| `--danger-border` | `#fecaca` | `#4a1c1f` |
| `--danger-border-strong` | `#f87171` | `#7f1d1d` |
| `--danger-text` | `#dc2626` | `#fca5a5` |

---

## Typography

### Font Families

- **PP Editorial Old** — hero displays, stat callouts, editorial headlines. Fallback: `Times New Roman, Georgia, serif`.
- **Inter** — body, headings, buttons, labels, captions. Fallback: `system-ui, sans-serif`.
- **JetBrains Mono** — code blocks. Fallback: `ui-monospace, monospace`.

### Established Patterns

| Pattern | Family | Size | Weight | Use |
|---|---|---|---|---|
| Hero display | PP Editorial | 84px | 400 | Marketing hero headline |
| Section heading | PP Editorial | 52px | 400 | Page headline, stat callouts |
| Subheading | Inter | 36px | 500 | Subsection headlines |
| Card title | Inter | 22–28px | 500 | Feature tiles, card titles |
| Body | Inter | 16px | 400 | Primary body text |
| Small body | Inter | 14px | 400–500 | Secondary text, buttons |
| Caption | Inter | 13px | 400–600 | Helper text, badges |

---

## Spacing & Geometry

### Spacing Scale

`xxs(4) xs(8) sm(12) md(16) lg(20) xl(24) xxl(32) xxxl(40) section-sm(48) section(64) section-lg(96) hero(120)`

### Border Radius

| Value | Use |
|---|---|
| 8px (`rounded-md`) | Buttons, inputs |
| 12px (`rounded-lg`) | Cards, panels (dominant radius) |
| 16px (`rounded-xl`) | Modals, large panels |
| 9999px (`rounded-full`) | Badges, pill tabs (NOT buttons) |

Buttons are **never** pills. The geometry is sober and editorial.

---

## Elevation

| Level | Treatment | Use |
|---|---|---|
| 0 (flat) | No shadow, `border-hairline-soft` | Default cards, inputs |
| 1 (subtle) | `shadow-sm` | Hover-elevated tiles |
| 2 (card) | `shadow-[rgba(0,0,0,0.04)_0px_4px_12px]` | Feature cards |
| 3 (modal) | `shadow-2xl` | Modals, dropdowns |

---

## Components

### Design Primitives (`src/components/design/`)

| Component | File | Variants |
|---|---|---|
| **Button** | `Button.tsx` | `primary`, `cream`, `dark`, `secondary`, `on-cream`, `link`, `ghost`, `outline`, `destructive`, `subtle` |
| **Card** | `Card.tsx` | `default`, `elevated`, `cream`, `cream-soft`, `feature-product`, `glass`, `outlined`, `filled` |
| **Badge** | `Badge.tsx` | `prospect`, `applied`, `interview`, `offer`, `rejected` |
| **SuccessPopup** | `SuccessPopup.tsx` | Single variant |
| **SunsetStripeBand** | `sunset-stripe-band.tsx` | Single variant (uses `var(--sunset-stripe)`) |

### Key Components (`src/components/`)

| Component | Theme Pattern |
|---|---|
| **NavBar** | `var(--*)` style attributes — canonical reference for complex nav |
| **Footer** | `var(--footer-cream)` background, `var(--beige-deep)` borders |
| **ThemeToggle** | All `var(--*)` style attributes |
| **PrivacyPipeline** | `var(--on-dark)` / `var(--on-dark-muted)` for on-dark contexts |
| **ClosingCTA** | `var(--cream)`, `var(--primary)`, `var(--ink)` |
| **FeatureBentoGrid** | All `var(--*)` style attributes |
| **TrustRibbon** | `var(--cream)`, `var(--steel)` |
| **HeroSection** | `var(--sunshine-700)`, `var(--primary)` |
| **LoadingScreen** | Breathing icon + orbiting status dots + pulse rings + rotating messages. `border-primary` for rings, `statusColors` for dots, `text-steel` for messages |
| **Spinner** | Inline SVG spinner, `stroke="currentColor"` — inherits button text color |

---

## Loading System

Every full-screen, section-level, and inline loading state uses a shared animated loader (`LoadingScreen.tsx`) that replaces the old static "Loading..." text. Button loading states use a lightweight `Spinner.tsx` component.

### Visual Anatomy

```
        ╭─ pulse ring (expanding, fading) ─╮
        │                                  │
        │    ● ····· ○ ····· ○             │  ← 5 status-colored dots
        │   ·  ╭─────────╮  ·              │     orbiting the icon
        │  ○   │  icon   │   ○             │
        │   ·  ╰─────────╯  ·              │
        │    ○ ····· ● ····· ○             │
        │          ╭─ pulse ring ─╮        │
        ╰──────────╰─────────────╯────────╯
                  "Fetching your saved jobs..."
```

The centerpiece is the **JobFoocus icon** (`public/icon.webp`) that gently breathes (scale 1 → 1.08, opacity 1 → 0.88, 2.4 s ease-in-out loop). Around it, **5 pipeline-colored dots** orbit in a circle (9 s linear loop). Behind the icon, **two sonar pulse rings** expand outward and fade (2.4 s ease-out loop, staggered by 1.2 s). Below, a **rotating context message** crossfades every 2.2 s with a fade-in-up motion.

### Pipeline Dots (Orbiting)

The 5 dots use the kanban status colors, matching the pipeline column order:

| Dot | Status | Color |
|---|---|---|
| 1 | Prospect | `#888888` (gray) |
| 2 | Applied | `#4a90e2` (blue) |
| 3 | Interview | `#f5a623` (amber) |
| 4 | Offer | `#4caf50` (green) |
| 5 | Rejected | `#e74c3c` (red) |

Colors are sourced from `statusColors` in `src/lib/design-system.ts` — not hardcoded. Lint-safe.

### Custom Keyframes (`tailwind.config.ts`)

| Keyframe | Utility Class | Duration | Easing | Loop |
|---|---|---|---|---|
| `jf-breathe` | `animate-jf-breathe` | 2.4 s | `ease-in-out` | infinite |
| `jf-orbit` | `animate-jf-orbit` | 9 s | `linear` | infinite |
| `jf-ring` | `animate-jf-ring` | 2.4 s | `ease-out` | infinite |
| `jf-fade-up` | `animate-jf-fade-up` | 0.5 s | `ease-out` | once (retriggered per message) |

All keyframes are brand-prefixed (`jf-`) to avoid collisions. Defined in `tailwind.config.ts` `theme.extend` — outside `src/`, so the theme lint never inspects them.

### Component API

#### `LoadingScreen` (`src/components/LoadingScreen.tsx`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `messages` | `string[]` | (required) | Rotating context messages. Cycles every 2.2 s. |
| `fullScreen` | `boolean` | `false` | `min-h-screen` (true) vs `min-h-[60vh]` (false). |
| `compact` | `boolean` | `false` | Breathing icon + message only (no orbit dots or pulse rings). For tight inline spots. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Icon size and orbit radius scale. |
| `className` | `string` | `''` | Additional classes merged onto the outer container. |

**Size presets:**

| Size | Icon | Orbit Radius | Dot | Ring |
|---|---|---|---|---|
| `sm` | 32 px | 28 px | 6 px | 44 px |
| `md` | 48 px | 44 px | 8 px | 68 px |
| `lg` | 64 px | 60 px | 10 px | 92 px |

**Message rotation mechanism:** `setInterval` every 2200 ms cycles an index through the `messages` array. The `<p>` element uses `key={idx}` to force a React remount, which retriggers the `jf-fade-up` CSS animation on each cycle. No external animation library needed.

#### `Spinner` (`src/components/Spinner.tsx`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `number` | `16` | Width and height in pixels. |
| `className` | `string` | `''` | Additional classes (e.g. `mr-2` for button spacing). |

Uses `stroke="currentColor"` so it inherits the parent button's text color automatically. Lint-safe (no hex, no inline style).

### Usage Map

**Full-screen / full-section loaders** (9 page-level spots):

| Page | Messages |
|---|---|
| Dashboard | "Fetching your saved jobs..." → "Arranging your kanban board..." → "Sorting follow-ups..." → "Almost there..." |
| Application detail | "Fetching your application..." → "Loading documents..." → "Preparing the timeline..." → "Almost there..." |
| Follow-ups | "Finding jobs that need attention..." → "Checking follow-up dates..." → "Almost there..." |
| Master resume | "Loading your master resume..." → "Preparing the editor..." → "Almost there..." |
| Document editor | "Loading your document..." → "Polishing the page..." → "Almost there..." |
| Auth (Suspense fallback) | "Preparing your workspace..." → "Almost there..." |
| Trash | "Fetching archived applications..." → "Almost there..." |
| Categories | "Loading your categories..." → "Almost there..." |
| Manage Categories modal | "Loading categories..." → "Almost there..." (size `sm`) |

**Compact inline loaders** (2 spots):

| Location | Messages |
|---|---|
| CategorySelector (form field placeholder) | "Loading categories..." |
| NavBar profile dropdown | "Loading your plan..." |

**Button loading states** (7 spots, using `Spinner`):

| Button | Loading Text |
|---|---|
| Auth — Google sign-in | "Redirecting..." |
| Auth — Magic link | "Sending link..." |
| Pricing CTA | "Loading…" |
| Razorpay — Update card | "Loading…" |
| Account — Delete | "Deleting…" |
| Account — Export | "Exporting…" |
| Account — Manage | "Opening…" |

### Design Notes

- **No external dependencies.** All animation is pure CSS keyframes + React state. No framer-motion, GSAP, or Lottie.
- **Lint-safe throughout.** Dot colors use the `statusColors` variable (allowlisted). Ring borders use `border-primary` token. Pulse-ring opacity is driven by the keyframe, not a Tailwind `/opacity` modifier on a hex CSS var. `transform` and `animationDelay` inline styles are not inspected by the theme lint.
- **Theme-aware.** The breathing icon, pulse rings, and message text all respond to the active light/dark theme automatically (icon stays the same; rings use `border-primary`; message text uses `text-steel`).

---

## How to Add a New Color Token

1. Add the CSS variable to both `:root` and `.dark` in `src/styles/globals.css`
2. Add the Tailwind mapping to `tailwind.config.ts` (`colors: { "token-name": "var(--token-name)" }`)
3. Add the token to the table in this document
4. Run `npm run lint:theme` to verify no violations

---

## How to Add a New Component

1. Extend the primitives in `src/components/design/` (use `Button`, `Card`, etc. as building blocks)
2. Use **only** semantic token classes (`bg-canvas`, `text-ink`, `border-hairline`, etc.)
3. Never use `bg-white`, `bg-stone-*`, `border-stone-*`, `text-stone-*`, or hardcoded hex colors
4. Run `npm run lint:theme` to verify
5. Add a 2-line entry to the Components table above

---

## What's NOT a Token (and Why)

| Pattern | Reason |
|---|---|
| Status colors (`applied: #4a90e2`, etc.) | Universal semantics — blue = applied, yellow = interview. Stays constant across themes. Defined in `src/lib/design-system.ts`. |
| `--on-dark: #ffffff` | Always white, even in light mode. It's a semantic "text on dark surface" value, not a theme-aware color. |
| `#ef4444`, `#eab308`, `#22c55e` | macOS traffic-light dots in demo browser mockups. Brand-stable illustration elements. Lint-exempt. |
| `cat.color` (user-provided) | User-defined category colors from the database. Can't be themed by the system. |

---

## The Auto-Lint Rule

`npm run lint:theme` scans every `.ts` and `.tsx` file in `src/` and **fails the build** if it finds:

- `bg-white`, `bg-stone-50`, `bg-stone-100`, `bg-stone-200`
- `border-stone-200`, `border-stone-300`
- `text-stone-400`, `text-stone-500`, `text-stone-700`
- Hardcoded hex in `bg-[#...]`, `text-[#...]`, `border-[#...]`
- Hardcoded hex in `style={{ color: '#...' }}` or `style={{ backgroundColor: '#...' }}`
- Non-`var()` string in `style={{ color: '...' }}` or `style={{ backgroundColor: '...' }}`

**Allowlisted exceptions:**
- `src/components/ResumeSkeletonCard.tsx` — demo graphics (macOS chrome)
- `src/components/JobApplicationWorkflow/index.tsx` — demo workflow graphic
- `bg-white animate-pulse` in `ApplicationCard.tsx` — loading pulse dot
- `bg-white` in `AccountAutoRenewToggle.tsx` — switch thumb
- macOS traffic-light hex colors (`#ef4444`, `#eab308`, `#22c55e`, `#ff5f57`, `#febc2e`, `#28c840`)
- `cat.color` references — user-provided category colors
- `statusColors` references — status palette

To add a new exception, edit the `INLINE_ALLOWLIST` array in `scripts/check-theme-tokens.mjs`.

---

## Reference Implementations

These files are the canonical examples for theme-aware code:

| File | Pattern |
|---|---|
| `src/components/PrivacyPipeline.tsx` | On-dark surface design |
| `src/components/NavBar.tsx` | Complex nav with inline event handlers |
| `src/app/(main)/support/page.tsx` | Form-heavy pages with `var(--*)` |
| `src/components/ClosingCTA.tsx` | Editorial hero with brand tokens |
| `src/components/HeroSection.tsx` | Sunset gradient + brand tokens |
| `src/components/design/Button.tsx` | Token-based variant system |
| `src/components/design/Card.tsx` | Token-based variant system |
