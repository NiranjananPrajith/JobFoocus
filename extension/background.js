// DASHBOARD_URL: the deep-link target for scraped job data.
//
// Three deployment environments are supported:
//   - Local dev:    http://localhost:3000/application
//   - Vercel alt:   https://job-foocus.vercel.app/application
//   - Production:   https://jobfoocus.com/application
//                   (Hostinger VPS or custom domain — change to yours)
//
// Switch by changing the value of DASHBOARD_URL below.
// Reload the extension at chrome://extensions after changing.
// See extension/README.md for full details.
const DASHBOARD_URL = "https://job-foocus.vercel.app/application";

const DASHBOARD_ORIGIN = new URL(DASHBOARD_URL).origin;

const BADGE_COLOR = "#DC2626"; // red-600
const BADGE_DURATION_MS = 3000;
const CONTEXT_MENU_ID = "send-to-jobfoocus";

let badgeClearTimer = null;

function showErrorBadge(text = "!") {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  if (badgeClearTimer) clearTimeout(badgeClearTimer);
  badgeClearTimer = setTimeout(() => {
    chrome.action.setBadgeText({ text: "" });
    badgeClearTimer = null;
  }, BADGE_DURATION_MS);
}

function findOpenDashboardTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: `${DASHBOARD_ORIGIN}/*` }, (tabs) => {
      resolve(tabs && tabs.length ? tabs[0] : null);
    });
  });
}

function focusOrCreateDashboardTab(targetUrl) {
  return findOpenDashboardTab().then((existing) => {
    if (existing && existing.id != null) {
      return new Promise((resolve) => {
        chrome.tabs.update(existing.id, { url: targetUrl, active: true }, (tab) => {
          if (existing.windowId != null) {
            chrome.windows.update(existing.windowId, { focused: true });
          }
          resolve(tab);
        });
      });
    }
    return new Promise((resolve) => {
      chrome.tabs.create({ url: targetUrl }, (tab) => resolve(tab));
    });
  });
}

// Build the deep-link URL from the content script's scrape result.
// Empty fields are dropped so the URL stays short.
function buildDashboardUrl(jobData, pageUrl) {
  const params = new URLSearchParams();
  if (jobData.title) params.set("title", jobData.title);
  if (jobData.company) params.set("company", jobData.company);
  if (jobData.description) params.set("jd", jobData.description);
  if (pageUrl) params.set("url", pageUrl);
  if (jobData.location) params.set("location", jobData.location);
  if (jobData.salary) params.set("salary", jobData.salary);
  if (jobData.postedDate) params.set("posted", jobData.postedDate);
  if (jobData.workType) params.set("workType", jobData.workType);
  if (jobData.looksLikeJob === false) params.set("heuristic", "miss");
  return `${DASHBOARD_URL}?${params.toString()}`;
}

// Returns true if the given URL is one we cannot run content scripts
// on (chrome://, edge://, the web store, an installed extension page,
// etc.). Surface as a friendly error to the popdown / context menu
// instead of a generic "Failed to inject content.js".
function isUnsupportedScrapeUrl(url) {
  if (!url) return true;
  return !/^https?:\/\//i.test(url);
}

// Shared scrape-and-open pipeline. Used by the popdown's "Add Job"
// button, the right-click context menu, and the keyboard shortcut
// (the latter two skip the popdown for power users). Returns a
// promise that resolves to { ok: true } on success or { ok: false,
// error: string } on failure so callers (e.g. popup.js) can show
// the right feedback.
async function scrapeAndOpen(tab) {
  if (!tab || tab.id == null) {
    showErrorBadge("!");
    return { ok: false, error: "No active tab." };
  }

  if (isUnsupportedScrapeUrl(tab.url)) {
    showErrorBadge("!");
    return {
      ok: false,
      error: "This page can't be scraped. Open a regular website and try again.",
    };
  }

  let results;
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  } catch (err) {
    console.error("Failed to inject content.js:", err);
    showErrorBadge("!");
    return {
      ok: false,
      error: "Couldn't read this page. Try reloading it and clicking again.",
    };
  }

  if (!results || !results[0] || !results[0].result) {
    console.error("Failed to scrape or read text content from page.");
    showErrorBadge("!");
    return {
      ok: false,
      error: "Couldn't find a job posting on this page.",
    };
  }

  const jobData = results[0].result;
  const pageUrl = (tab && tab.url) || jobData.url || "";
  const targetUrl = buildDashboardUrl(jobData, pageUrl);

  try {
    await focusOrCreateDashboardTab(targetUrl);
  } catch (err) {
    console.error("Failed to open dashboard tab:", err);
    showErrorBadge("!");
    return { ok: false, error: "Couldn't open the dashboard tab." };
  }

  return { ok: true };
}

// Helper: resolve the active tab in the current window. Used by the
// popdown message handler and the keyboard shortcut.
function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0]);
    });
  });
}

// ----- entry point 1: popdown "Add Job" button -----
// The popdown sends an 'addJob' message; we run scrapeAndOpen on the
// active tab and send back the result so popup.js can show an inline
// error if something fails. The popdown auto-closes on success.
//
// We return `true` from the listener to keep the message channel open
// for the async response (the standard MV3 pattern).
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "addJob") return false;
  (async () => {
    const tab = await getActiveTab();
    const result = await scrapeAndOpen(tab);
    sendResponse(result);
  })();
  return true;
});

// ----- entry point 2: keyboard shortcut (Ctrl+Shift+J / Command+Shift+J) -----
// Opens the popdown (default `_execute_action` behavior with
// default_popup set in the manifest). We still wire the command
// listener explicitly so we can repurpose the shortcut later (e.g.
// direct-trigger "Add Job" without the popdown).
chrome.commands.onCommand.addListener((command) => {
  if (command !== "_execute_action") return;
  // No-op: the browser opens the popdown automatically.
  // The user clicks "Add Job" in the popdown, which routes through
  // the 'addJob' message handler above.
});

// ----- entry point 3: right-click context menu (power-user shortcut) -----
// Skips the popdown: a single right-click → single Add Job. Same
// underlying pipeline (scrapeAndOpen) — no behavior change vs. v1.1.
chrome.runtime.onInstalled.addListener(() => {
  // Remove any prior menu (in case the user re-installed with a changed id)
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      {
        id: CONTEXT_MENU_ID,
        title: "Send page to JobFoocus",
        contexts: ["page", "selection", "link"],
      },
      () => {
        // If creation failed (e.g., permissions not granted in some browsers),
        // log and move on. The toolbar icon still works.
        if (chrome.runtime.lastError) {
          console.warn("contextMenus.create failed:", chrome.runtime.lastError.message);
        }
      }
    );
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  scrapeAndOpen(tab);
});
