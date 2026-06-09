// popup.js — runs in the popdown when the user clicks the toolbar icon.
//
// UX: the popdown stays open while we kick off the scrape-and-open
// flow in the background script (so the user gets visual feedback
// that something is happening), then closes itself. The dashboard
// tab is opened/created by the background script — see the 'addJob'
// message handler in background.js.
//
// If the message round-trip or the background scrape fails, we show
// an inline error banner instead of silently closing.

(() => {
  const btn = document.getElementById('add-job');
  const label = document.getElementById('add-job-label');
  const status = document.getElementById('status');

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

  // Disable the button the moment the user clicks, so a double-click
  // doesn't fire the message twice. The popdown closes shortly after.
  const lockButton = () => {
    btn.disabled = true;
    label.textContent = 'Adding…';
  };

  const showErrorAndStay = (msg) => {
    btn.disabled = false;
    label.textContent = 'Add Job';
    setStatus(msg, true);
  };

  btn.addEventListener('click', () => {
    lockButton();
    setStatus(null, false);

    // Fire the message; the background script does the actual scrape
    // and opens the dashboard tab. We return-true from the listener
    // there to keep the message channel open, so we get a real ack.
    try {
      chrome.runtime.sendMessage({ type: 'addJob' }, (response) => {
        const err = chrome.runtime.lastError;
        if (err || !response || !response.ok) {
          // Most common cause: the background script threw, or the
          // user clicked the popdown on a tab the extension can't
          // run scripts on (e.g. chrome:// pages, the web store).
          showErrorAndStay(
            err?.message ||
              response?.error ||
              "Couldn't add this job. Make sure you're on a regular webpage and try again."
          );
          return;
        }
        // Success: close the popdown. The dashboard tab will be
        // focused/created by the background script.
        window.close();
      });
    } catch (e) {
      showErrorAndStay("Couldn't reach the extension. Try again.");
    }
  });
})();
