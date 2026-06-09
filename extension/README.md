# JobFoocus Browser Extension

## How to Install (Unpacked)

The extension targets Chrome / Edge / Brave and Firefox (MV3).

1. **Chrome / Edge / Brave**: open `chrome://extensions` (or `edge://extensions`).
   **Firefox**: open `about:debugging#/runtime/this-firefox`.
2. Enable **Developer mode** (Chrome/Edge/Brave: toggle in the top-right corner).
3. **Chrome / Edge / Brave**: click **Load unpacked** and select the `extension/` folder.
   **Firefox**: click **Load Temporary Add-on…** and select `extension/manifest.json`.
4. Pin the extension to the toolbar (click the puzzle icon, then the pin icon next to JobFoocus).

> **Firefox note:** Firefox's MV3 implementation uses `background.scripts` instead
> of `service_worker`. The manifest declares both fields; Chrome uses the
> service worker, Firefox uses the scripts array. Either browser loads the same
> package unchanged.

## Usage

The extension has a small popdown interface. Three ways to open it:

- Click the JobFoocus icon in the browser toolbar.
- Press **Ctrl+Shift+J** (Windows/Linux) or **Command+Shift+J** (macOS).
- Right-click anywhere on a page and choose **Send page to JobFoocus** (skips the popdown and imports immediately — power-user shortcut).

When the popdown is open, click **Add Job** to extract the job title, company,
description, and metadata from the current page and open your JobFoocus
dashboard with the data pre-filled. The dashboard is brought to the front if
a tab is already open, or a new tab is created.

If the page can't be scraped (e.g. `chrome://` pages, the Chrome Web Store,
or pages where the content script is blocked), the popdown shows a short
inline error explaining why.

## Changing the Dashboard URL

By default the extension sends data to `https://job-foocus.vercel.app/application`.

Three deployment environments are supported:

| Environment | DASHBOARD_URL value |
|---|---|
| Local dev | `http://localhost:3000/application` |
| Vercel alt | `https://job-foocus.vercel.app/application` |
| Production | `https://jobfoocus.com/application` (or your custom domain) |

To change it:

1. Open `extension/background.js`.
2. Update the `DASHBOARD_URL` constant (line 12) to your target URL.
3. Reload the extension at `chrome://extensions` (click the refresh icon on the JobFoocus card).

## Layout

```
extension/
├── manifest.json     # MV3 manifest, cross-browser (service_worker + scripts)
├── background.js     # service worker: scrape pipeline + message router
├── content.js        # runs in the page, extracts job fields
├── popup.html        # popdown UI shell
├── popup.js          # popdown button handler
└── icons/            # toolbar + action icons
```

`npm run build:extension` packages the folder into
`public/extensions/build/jobfoocus-extension.zip` (the file the
`/extension-install` page serves as a download).
