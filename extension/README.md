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

Navigate to any job posting on a supported job board and click the JobFoocus extension icon in your toolbar. The extension will extract the job title, company, and description, then open your JobFoocus dashboard with the data pre-filled.

## Changing the Dashboard URL

By default the extension sends data to `http://localhost:3000/application` (your local dev server).

Three deployment environments are supported:

| Environment | DASHBOARD_URL value |
|---|---|
| Local dev | `http://localhost:3000/application` |
| Vercel alt | `https://job-foocus.vercel.app/application` |
| Production | `https://jobfoocus.com/application` (or your custom domain) |

To change it:

1. Open `extension/background.js`.
2. Update the `DASHBOARD_URL` constant (line 2) to your target URL.
3. Reload the extension at `chrome://extensions` (click the refresh icon on the JobFoocus card).
