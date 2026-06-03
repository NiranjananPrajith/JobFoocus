(() => {
  // Select job title candidate text elements from common job boards
  let title = document.querySelector('h1, .job-title, [class*="job-title"]')?.innerText?.trim() || "";

  // Select company name candidate text elements
  let company = document.querySelector('.company-name, [class*="companyName"], [class*="subtitle"]')?.innerText?.trim() || "";

  // Isolate main job description body elements
  let description = "";
  const jdContainer = document.querySelector('#job-description, .job-description, [class*="jobDescriptionCollection"], #jobDescriptionText, .jobs-description__content');

  if (jdContainer) {
    description = jdContainer.innerText.trim();
  } else {
    // Privacy guard: only fall back to body text on known job board domains
    const JOB_BOARD_PATTERN = /(indeed|linkedin|glassdoor|monster|ziprecruiter|careerbuilder)\.(com|ca|co\.uk)$/i;
    const isJobBoard = JOB_BOARD_PATTERN.test(window.location.hostname);
    if (isJobBoard) {
      description = document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 5000);
    }
  }

  // Fallback parsing heuristics if explicit tags were unmapped
  if (!title) title = document.title;

  return {
    title: title,
    company: company,
    description: description
  };
})();