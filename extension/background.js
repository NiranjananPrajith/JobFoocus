// Target URL for your local development or production hosted NextJS environment
// ⚠️ Change this to your actual domain before distributing.
// See extension/README.md for details.
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