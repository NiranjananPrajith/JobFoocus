# JobFoocus design system

The approved direction is soft, expressive SaaS: rounded typography, warm surfaces, orange/gold accents from the logo, and clear task-oriented information. The homepage and dashboard prototypes establish the visual direction; the production layouts now apply it across all routes.

## Shared foundations

Nunito Sans is loaded once through Next Font in `src/app/layout.tsx`. Both Tailwind `font-sans` and `font-display` resolve to it. The actual resume/document font chooser remains independent: redesigning the application chrome must not change exported documents.

`src/styles/globals.css` supplies the full semantic token catalog. The approved palette and shared layout rules in `src/styles/redesign.css` override it in light and dark modes. `tailwind.config.ts` maps these tokens and defines rounded geometry. Use semantic colors in TSX; do not add hardcoded color literals or expand the theme-lint allowlist.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--canvas` | #f7f5f2 | #161b22 | Workspace background |
| `--surface` | #ffffff | #1e232b | Cards and inputs |
| `--card` | #fffdfb | #1e232b | Warm panels |
| `--ink` | #28242b | #f6f1ea | Main text |
| `--steel` | #68616b | #b8afa8 | Supporting text |
| `--primary` | #c54924 | #f5a07b | Main action |
| `--on-primary` | #ffffff | #24170f | Action text |
| `--cream` | #fff0e5 | #392b25 | Accent panel |
| `--hairline` | #ece7e1 | #3c3937 | Panel border |

Use 20–28px radii for cards, 26–38px for page frames, 14px for fields, and pill-shaped primary buttons. Smaller icon buttons may use 9–15px radii. Favor thin borders and restrained shadows. Strong contrast, readable labels, and useful hierarchy take priority over decoration.

## Layouts and navigation

`SiteShell` wraps main, authentication, and document layouts. Public routes use the homepage header and footer in a white rounded frame. Workspace routes use the approved compact sidebar and a spacious content area. The sidebar is sized to its contents and scrolls internally when the viewport is short. On phones, its labelled navigation button reveals the same links.

Workspace link order: Applications, Follow-ups, Master resume, All Jobs, Manage categories, Install extension, Trash. Account and billing, help, theme switching, and sign-out sit in the separate account section. All options are inline; there is no profile popover or Back to homepage item. `NavigationIcon` supplies a consistent rounded outline icon set.

The document editor uses the workspace shell, but document content and printing stay independent. Hide workspace navigation and chrome for printing; preserve original document dimensions and fonts.

## Dashboard and working screens

Dashboard summaries derive from real application data. Show saved opportunities, sent applications, interview-stage roles, and follow-ups. Keep the five existing pipeline statuses. Search and category filters apply to the board; clear-filter and no-match states must remain understandable. Preserve pointer, touch, and keyboard drag-and-drop. Cards show company, title, category, available documents, application date, and follow-up state. All Jobs uses a list of the same saved application records.

Shared cards, buttons, forms, typography, surfaces, borders, and radii apply to application details, master resume, follow-ups, categories, trash, account, insider access, document controls, pricing, extension installation, support, authentication, and legal pages. Keep business logic and storage-adapter boundaries intact.

## Artwork and content

Transparent GPT Image artwork lives in `prototypes/redesign/assets`; optimized WebP files are served from `public/images/redesign`. Use expressive illustrations for marketing or onboarding; keep working screens focused on actual information. Never put essential information only in an image. Provide dimensions, appropriate alt text, and reduced-motion support.

Explain features directly instead of offering simulated feature demos. Describe tailored resumes and cover letters, browser capture, application tracking, follow-ups, and AI document editing. Users review and submit applications themselves. Tier limits come only from `src/lib/limits.ts`.

## Accessibility and verification

Provide visible focus, labelled inputs, a skip link, accessible names for icon buttons, and text labels for status colors. Keep primary actions reachable on mobile. Test keyboard navigation, mobile menu, filters, empty states, light/dark themes, and document printing. Run TypeScript, `lint:theme`, and a production build. Verify real public routes and authenticated workspace workflows in a browser; never weaken authentication to take screenshots.
