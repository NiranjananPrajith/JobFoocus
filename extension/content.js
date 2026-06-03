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
    // Privacy guard: heuristic check that the page is a job posting.
    // URL or page title must contain 'job' or 'career' to fall back
    // to body text. This catches LinkedIn, Indeed, Glassdoor, company
    // career pages, Greenhouse, Lever, Ashby, etc. — anywhere a job
    // posting would mention 'job' or 'career' somewhere in the URL or
    // page title. False positives are possible (e.g., a blog post
    // titled "Why I love my job") but the worst case is the user gets
    // an irrelevant JD in their dashboard, which is recoverable
    // (they can edit it manually before submitting).
    const url = window.location.href.toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const isJobPage = url.includes('job') || url.includes('career') || pageTitle.includes('job') || pageTitle.includes('career');
    if (isJobPage) {
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