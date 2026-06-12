// content.js — runs in the page context when triggered by the toolbar icon,
// keyboard shortcut, or right-click menu.
//
// Strategy:
//   1. Match the page URL against a small per-site scraper table.
//   2. If no match, fall back to generic selectors + a privacy-guarded
//      body-text scrape (URL/title must contain 'job' or 'career').
//
// Each scraper returns:
//   { title, company, description, location, salary, postedDate, workType }
//
// All fields are best-effort. Empty string means "not found".

(() => {
  const HOST = window.location.hostname.toLowerCase();

  // ----------------------------- scraper table -----------------------------

  // Helper: first non-empty text from a list of selectors
  const pickText = (selectors) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText && el.innerText.trim()) {
        return el.innerText.trim();
      }
    }
    return '';
  };

  // Helper: text from a single element, or ''. Trims and caps length.
  const txt = (sel, max = 8000) => {
    const el = document.querySelector(sel);
    if (!el) return '';
    const t = (el.innerText || '').trim();
    return max && t.length > max ? t.slice(0, max) : t;
  };

  // Helper: first matching element, returning its text or attr
  const attr = (selectors, attrName) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const v = attrName ? el.getAttribute(attrName) : el.innerText;
        if (v && v.trim()) return v.trim();
      }
    }
    return '';
  };

  // Work-type detection: looks for "remote", "hybrid", "on-site"/"onsite" near
  // the location/title. Best-effort — empty string if not found.
  const detectWorkType = () => {
    const blob = (document.body.innerText || '').slice(0, 3000).toLowerCase();
    const isRemote = /\bremote\b/.test(blob) || /work from home|wfh/.test(blob);
    const isHybrid = /\bhybrid\b/.test(blob);
    const isOnsite = /\b(on[-\s]?site|on[-\s]?premise|in[-\s]?office)\b/.test(blob);
    if (isHybrid && isRemote) return 'Hybrid';
    if (isRemote) return 'Remote';
    if (isOnsite) return 'On-site';
    return '';
  };

  // Per-site scrapers keyed by hostname substring match
  const SCRAPERS = [
    {
      // LinkedIn job postings
      match: (h) => h.includes('linkedin.com'),
      scrape: () => ({
        title: pickText(['h1.job-title', 'h1.top-card-layout__title', '.job-details-jobs-unified-top-card__job-title', 'h1']),
        company: pickText([
          '.job-details-jobs-unified-top-card__company-name a',
          '.job-details-jobs-unified-top-card__company-name',
          '.top-card-layout__second-subline .topcard__org-name-link',
          'a.topcard__org-name-link',
        ]),
        description: txt('.description__text, .jobs-description__content, .job-details-jobs-unified-top-card__job-description', 8000),
        location: pickText([
          '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
          '.top-card-layout__first-subline .topcard__flavor--bullet',
          '.job-details-jobs-unified-top-card__bullet',
        ]),
        salary: pickText([
          '.job-details-jobs-unified-top-card__job-insight--highlight',
          '.salary-main-rail__data-wrapper',
        ]),
        postedDate: pickText([
          '.job-details-jobs-unified-top-card__posted-date',
          '.posted-time-ago__text',
          'time',
        ]),
        workType: detectWorkType(),
      }),
    },
    {
      // Indeed
      match: (h) => h.includes('indeed.com'),
      scrape: () => ({
        title: pickText([
          'h1.jobsearch-JobInfoHeader-title',
          '[data-testid="jobTitle"]',
          'h1',
        ]),
        company: pickText([
          '[data-testid="inlineHeader-companyName"]',
          '[data-company-name="true"]',
          '.jobsearch-CompanyInfoWithoutHeaderImage a',
        ]),
        description: txt('#jobDescriptionText, [data-testid="jobDescriptionText"], .jobsearch-jobDescriptionText', 8000),
        location: pickText([
          '[data-testid="inlineHeader-companyLocation"]',
          '[data-testid="job-location"]',
          '.jobsearch-JobInfoHeader-subtitle > div:nth-child(2)',
        ]),
        salary: pickText([
          '[data-testid="job-salary"]',
          '.jobsearch-JobMetadataHeader-item .attribute_snippet',
          '#salaryInfoAndJobType',
        ]),
        postedDate: pickText([
          '[data-testid="job-age"]',
          '.jobsearch-JobMetadataHeader-item .date',
        ]),
        workType: detectWorkType(),
      }),
    },
    {
      // Greenhouse-hosted job boards (boards.greenhouse.io, job-boards.greenhouse.io, *.greenhouse.io)
      match: (h) => h.includes('greenhouse.io') || h.includes('grnh.se'),
      scrape: () => ({
        title: pickText(['h1.app-title', '.job-title', 'h1.posting-title', 'h1']),
        company: pickText(['.company-name', '.job-company', '.posting-company']),
        description: txt('#content, .job-description, .posting-content, [data-marker="job-description"]', 8000),
        location: pickText(['.location', '.job-location', '.posting-location']),
        salary: '',
        postedDate: pickText(['.posting-date', '.job-posted-at']),
        workType: detectWorkType(),
      }),
    },
    {
      // Lever
      match: (h) => h.includes('lever.co'),
      scrape: () => ({
        title: pickText(['h2.posting-title', 'h1.posting-title', '.posting-title', 'h1']),
        company: pickText(['.main-header-text .company-name', '.posting-company']),
        description: txt('.posting-page, .content, .job-description', 8000),
        location: pickText(['.posting-categories .location', '.work-location', '.location']),
        salary: pickText(['.posting-categories .salary', '.compensation']),
        postedDate: '',
        workType: detectWorkType(),
      }),
    },
    {
      // Ashby
      match: (h) => h.includes('ashbyhq.com'),
      scrape: () => ({
        title: pickText(['h1._title_, [class*="JobTitle"], h1']),
        company: pickText(['[class*="CompanyName"]', 'h1 + a, h1 + div a']),
        description: txt('[class*="JobDescription"], [class*="description"], .job-description', 8000),
        location: pickText(['[class*="Location"]', '[class*="location"]']),
        salary: '',
        postedDate: '',
        workType: detectWorkType(),
      }),
    },
    {
      // Workday (myworkdayjobs.com, *.myworkday.com)
      match: (h) => h.includes('myworkdayjobs.com') || h.includes('myworkday.com'),
      scrape: () => ({
        title: pickText(['h1[data-automation-id="jobPostingHeader"]', 'h1']),
        company: pickText(['[data-automation-id="jobPostingCompany"]', '.company-name']),
        description: txt('[data-automation-id="jobPostingDescription"], .job-description, [data-automation-id="jobDescription"]', 8000),
        location: pickText(['[data-automation-id="jobPostingLocation"]', '[data-automation-id="locations"]']),
        salary: '',
        postedDate: pickText(['[data-automation-id="jobPostingStartDate"]']),
        workType: detectWorkType(),
      }),
    },
    {
      // SmartRecruiters
      match: (h) => h.includes('smartrecruiters.com'),
      scrape: () => ({
        title: pickText(['h1.job-title', 'h1']),
        company: pickText(['.company-name', '.job-company-name']),
        description: txt('.job-description, .job-sections', 8000),
        location: pickText(['.job-location', '.location']),
        salary: '',
        postedDate: pickText(['.job-posted', 'time']),
        workType: detectWorkType(),
      }),
    },
    {
      // BambooHR careers
      match: (h) => h.includes('bamboohr.com'),
      scrape: () => ({
        title: pickText(['h1', '.job-title', '[class*="JobTitle"]']),
        company: pickText(['.company-name', '.BambooHR-Atlas .company']),
        description: txt('.job-description, [class*="jobDescription"], #job-description', 8000),
        location: pickText(['.job-location', '.location']),
        salary: '',
        postedDate: '',
        workType: detectWorkType(),
      }),
    },
  ];

  // ------------------------- main extraction logic -------------------------

  const url = window.location.href;
  const pageTitle = (document.title || '').toLowerCase();
  const urlLower = url.toLowerCase();
  const isJobPage = urlLower.includes('job') || urlLower.includes('career') || pageTitle.includes('job') || pageTitle.includes('career');

  let title = '';
  let company = '';
  let description = '';
  let location = '';
  let salary = '';
  let postedDate = '';
  let workType = '';

  // 1. Try per-site scraper
  for (const scraper of SCRAPERS) {
    if (scraper.match(HOST)) {
      const r = scraper.scrape();
      title = r.title || '';
      company = r.company || '';
      description = r.description || '';
      location = r.location || '';
      salary = r.salary || '';
      postedDate = r.postedDate || '';
      workType = r.workType || '';
      break;
    }
  }

  // 2. Generic fallbacks (used when no per-site scraper matched, or
  //    per-site scraper returned empty fields)
  if (!title) {
    title = document.querySelector('h1, .job-title, [class*="job-title"]')?.innerText?.trim() || '';
  }
  if (!company) {
    company = document.querySelector('.company-name, [class*="companyName"]')?.innerText?.trim() || '';
  }
  if (!description) {
    const jdContainer = document.querySelector('#job-description, .job-description, [class*="jobDescriptionCollection"], #jobDescriptionText, .jobs-description__content, [class*="jobDescription"], [data-marker="job-description"]');
    if (jdContainer) {
      description = jdContainer.innerText.trim();
    }
  }

  // 3. Last-resort description: body text, ONLY if the heuristic says the
  //    page looks like a job. Privacy guard: see comment below.
  if (!description && isJobPage) {
    // Privacy guard: heuristic check that the page is a job posting.
    // URL or page title must contain 'job' or 'career' to fall back
    // to body text. False positives are possible (e.g., a blog post
    // titled "Why I love my job") but the worst case is the user gets
    // an irrelevant JD in their dashboard, which is recoverable
    // (they can edit it manually before submitting).
    description = document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 5000);
  }

  // 4. Title fallback: use the page's <title>
  if (!title) title = document.title;

  return {
    title,
    company,
    description,
    location,
    salary,
    postedDate,
    workType,
    url,
    looksLikeJob: isJobPage,
  };
})();
