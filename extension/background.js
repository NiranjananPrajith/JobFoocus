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

chrome.action.onClicked.addListener((tab) => {
  // Execute the data extraction routine on the active page
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  }, (results) => {
    if (!results || !results[0] || !results[0].result) {
      console.error("Failed to scrape or read text content from page.");
      return;
    }

    const jobData = results[0].result;

    // Safely encode parsed values to pass via deep-link parameters
    const urlParams = new URLSearchParams({
      title: jobData.title || '',
      company: jobData.company || '',
      jd: jobData.description || ''
    });

    // Create a new browser tab opening your Next.js application with the job context loaded
    chrome.tabs.create({
      url: `${DASHBOARD_URL}?${urlParams.toString()}`
    });
  });
});