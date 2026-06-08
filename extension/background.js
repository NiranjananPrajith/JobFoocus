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
const DASHBOARD_URL = "http://localhost:3000/application";

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

// Shared scrape-and-open pipeline. Used by all three entry points
// (toolbar click, keyboard shortcut, right-click menu).
async function scrapeAndOpen(tab) {
  if (!tab || tab.id == null) {
    showErrorBadge("!");
    return;
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
    return;
  }

  if (!results || !results[0] || !results[0].result) {
    console.error("Failed to scrape or read text content from page.");
    showErrorBadge("!");
    return;
  }

  const jobData = results[0].result;
  const pageUrl = (tab && tab.url) || jobData.url || "";
  const targetUrl = buildDashboardUrl(jobData, pageUrl);

  try {
    await focusOrCreateDashboardTab(targetUrl);
  } catch (err) {
    console.error("Failed to open dashboard tab:", err);
    showErrorBadge("!");
  }
}

// ----- entry point 1: toolbar icon click -----
chrome.action.onClicked.addListener((tab) => {
  scrapeAndOpen(tab);
});

// ----- entry point 2: keyboard shortcut (Ctrl+Shift+J / Command+Shift+J) -----
// The default `_execute_action` command routes to chrome.action.onClicked,
// so no extra listener is strictly required, but wiring it explicitly
// makes the contract clear and lets us add custom commands later.
chrome.commands.onCommand.addListener((command) => {
  if (command !== "_execute_action") return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    scrapeAndOpen(tabs && tabs[0]);
  });
});

// ----- entry point 3: right-click context menu -----
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
