// popup.js — runs in the popdown when the user clicks the toolbar icon.
//
// Three sections:
//   1. "Add Job" — scrapes the current page and opens the dashboard
//   2. Navigation links — Dashboard and Jobs (reuse existing tab)
//   3. Account — shows current plan tier + link to /account
//
// Tier info is read from chrome.storage.local. The web app's /account
// page writes the tier there on load (see account/page.tsx).

(() => {
  // --- DOM refs ---
  const btn = document.getElementById('add-job');
  const label = document.getElementById('add-job-label');
  const status = document.getElementById('status');
  const navDashboard = document.getElementById('nav-dashboard');
  const navJobs = document.getElementById('nav-jobs');
  const navAccount = document.getElementById('nav-account');
  const tierBadge = document.getElementById('tier-badge');

  // --- Helpers ---
  const setStatus = (msg, isError) => {
    if (!msg) {
      status.classList.remove('is-visible', 'is-error');
      status.textContent = '';
      return;
    }
    status.textContent = msg;
    status.classList.add('is-visible');
    status.classList.toggle('is-error', !!isError);
  };

  const lockButton = () => {
    btn.disabled = true;
    label.textContent = 'Adding\u2026';
  };

  const showErrorAndStay = (msg) => {
    btn.disabled = false;
    label.textContent = 'Add Job';
    setStatus(msg, true);
  };

  const navigateTo = (url) => {
    chrome.runtime.sendMessage({ type: 'navigate', url });
    window.close();
  };

  // --- Section 1: Add Job ---
  btn.addEventListener('click', () => {
    lockButton();
    setStatus(null, false);

    try {
      chrome.runtime.sendMessage({ type: 'addJob' }, (response) => {
        const err = chrome.runtime.lastError;
        if (err || !response || !response.ok) {
          showErrorAndStay(
            err?.message ||
              response?.error ||
              "Couldn't add this job. Make sure you're on a regular webpage and try again."
          );
          return;
        }
        window.close();
      });
    } catch (e) {
      showErrorAndStay("Couldn't reach the extension. Try again.");
    }
  });

  // --- Section 2: Navigation ---
  navDashboard.addEventListener('click', () => {
    navigateTo('https://job-foocus.vercel.app/dashboard');
  });

  navJobs.addEventListener('click', () => {
    navigateTo('https://job-foocus.vercel.app/jobs');
  });

  // --- Section 3: Account ---
  navAccount.addEventListener('click', () => {
    navigateTo('https://job-foocus.vercel.app/account');
  });

  // --- Tier display (read from chrome.storage.local) ---
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get('jfTier', (data) => {
      const tier = (data.jfTier || '').toLowerCase();
      const validTiers = ['free', 'pro', 'max'];
      if (validTiers.includes(tier)) {
        tierBadge.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
        tierBadge.className = 'tier-badge tier-' + tier;
      }
      // If no data stored yet, default "Free" badge remains from HTML.
    });
  }
})();
