# JobFoocus Browser Extension

## How to Install (Unpacked)

1. Open `chrome://extensions` in Chrome (or `edge://extensions` in Edge).
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `extension/` folder from this project.
5. Pin the extension to the toolbar (click the puzzle icon, then the pin icon next to JobFoocus).

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
