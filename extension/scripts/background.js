// Extension Background Service Worker
// Handles long-running tasks like LLM generation that can't run in popup

// PII Masking functions (duplicated from pii-utils.ts since background.js can't import TS)
function maskPII(text, profile) {
  let masked = text;

  if (profile.name) {
    const nameParts = profile.name.split(/\s+/);
    nameParts.forEach(part => {
      masked = masked.replace(new RegExp(part, 'gi'), '[CANDIDATE_NAME]');
    });
    masked = masked.replace(new RegExp(profile.name, 'gi'), '[CANDIDATE_NAME]');
  }

  if (profile.phone) {
    const digitsOnly = profile.phone.replace(/[^\d]/g, '');
    if (digitsOnly.length >= 10) {
      masked = masked.replace(new RegExp(digitsOnly, 'g'), '[CANDIDATE_PHONE]');
    }
  }

  if (profile.email) {
    masked = masked.replace(new RegExp(profile.email, 'gi'), '[CANDIDATE_EMAIL]');
    const emailParts = profile.email.split('@');
    if (emailParts.length === 2) {
      masked = masked.replace(new RegExp(emailParts[0], 'gi'), '[CANDIDATE_EMAIL_USER]');
    }
  }

  if (profile.links && profile.links.length > 0) {
    profile.links.forEach(link => {
      const escapedLink = link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      masked = masked.replace(new RegExp(escapedLink, 'gi'), '[CANDIDATE_LINK]');
    });
  }

  return masked;
}

function demaskPII(text, profile) {
  let demasked = text;

  if (profile.email) {
    demasked = demasked.replace(/\[CANDIDATE_EMAIL_USER\]/g, profile.email.split('@')[0]);
    demasked = demasked.replace(/\[CANDIDATE_EMAIL\]/g, profile.email);
  }

  if (profile.links && profile.links.length > 0) {
    profile.links.forEach(link => {
      demasked = demasked.replace(/\[CANDIDATE_LINK\]/g, link);
    });
  }

  if (profile.phone) {
    demasked = demasked.replace(/\[CANDIDATE_PHONE\]/g, profile.phone);
  }

  if (profile.name) {
    demasked = demasked.replace(/\[CANDIDATE_NAME\]/g, profile.name);
  }

  return demasked;
}

function extractPIIProfile(masterResumeHtml) {
  const emailMatch = masterResumeHtml.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = masterResumeHtml.match(/[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/);
  const linkMatches = masterResumeHtml.match(/https?:\/\/[^\s<>"']+/g) || [];
  const nameMatch = masterResumeHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);

  return {
    name: nameMatch ? nameMatch[1].trim() : undefined,
    email: emailMatch ? emailMatch[0] : undefined,
    phone: phoneMatch ? phoneMatch[0] : undefined,
    links: linkMatches.length > 0 ? linkMatches : undefined,
  };
}

// Helper to get storage data
function getStorageData(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

// Helper to set storage data
function setStorageData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

// Generate unique folder name
function generateFolderName(companyName, jobTitle) {
  const date = new Date().toISOString().split('T')[0];
  const safeCompany = companyName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  const safeTitle = jobTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  return `${date}_${safeCompany}_${safeTitle}`;
}

// Register context menu for Application Assistant
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'answer-with-job-foocus',
    title: 'Answer with Job Foocus',
    contexts: ['selection']
  });
  // Schedule hourly sync alarm (MV3 service workers die after ~30s, use alarms instead of setInterval)
  chrome.alarms.create('sync_alarm', { periodInMinutes: 60 });
});

// Context menu handler - storage-first handoff pattern
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'answer-with-job-foocus' && info.selectionText) {
    chrome.storage.local.set({
      assistant_question: info.selectionText.trim(),
      assistant_url: tab?.url || '',
      assistant_timestamp: Date.now()
    }, () => {
      if (tab?.windowId) {
        chrome.sidePanel.open({ windowId: tab.windowId });
      }
      chrome.runtime.sendMessage({ action: 'NEW_ASSISTANT_SELECTION' }).catch(() => {
        // Suppress errors if side panel isn't open yet to receive the broadcast
      });
    });
  }
});

// Classify job category based on keywords
function classifyCategory(jobDescription) {
  const techKeywords = ['it', 'tech support', 'helpdesk', 'software', 'developer', 'systems', 'network', 'security', 'data'];
  const kitchenKeywords = ['cook', 'chef', 'kitchen', 'food', 'restaurant', 'catering', 'line cook', 'prep'];

  const lowerDesc = jobDescription.toLowerCase();

  if (techKeywords.some(k => lowerDesc.includes(k))) {
    return '1_tech_support';
  }
  if (kitchenKeywords.some(k => lowerDesc.includes(k))) {
    return '3_kitchen_cook';
  }
  return '2_general_basic';
}

// Alarm listener — scheduled background sync
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync_alarm') {
    chrome.storage.local.get(['cloud_sync_provider', 'cloud_access_token'], (settings) => {
      if (settings.cloud_sync_provider && settings.cloud_access_token) {
        // Notify the side panel/dashboard to run the sync
        chrome.runtime.sendMessage({
          action: 'CLOUD_BACKGROUND_SYNC',
          provider: settings.cloud_sync_provider,
          token: settings.cloud_access_token
        }).catch(() => {
          // No active listeners — silent failure is fine for background sync
        });
      }
    });
  }
});

// Main message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'syncToCloud') {
    const { token, provider, payload } = message;
    if (provider === 'gdrive') {
      (async () => {
        const result = await uploadToGDrive(token, payload);
        sendResponse({ success: true, result });
      })();
    }
    return true;
  }

  if (message.action === 'CLOUD_AUTH') {
    const { provider } = message;
    const redirectUrl = chrome.identity.getRedirectURL();
    let authUrl = '';
    let scope = '';
    let clientId = '';

    switch (provider) {
      case 'google':
        clientId = 'test-google-id';
        authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
        scope = 'https://www.googleapis.com/auth/drive.appdata';
        break;
      case 'onedrive':
        clientId = 'test-onedrive-id';
        authUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
        scope = 'https://graph.microsoft.com/files.readwrite.appfolder';
        break;
      case 'dropbox':
        clientId = 'test-dropbox-id';
        authUrl = 'https://www.dropbox.com/oauth2/authorize';
        scope = '';
        break;
      default:
        sendResponse({ success: false, error: 'Unknown provider' });
        return true;
    }

    const scopeParam = provider !== 'dropbox' ? `&scope=${encodeURIComponent(scope)}` : '';
    const fullAuthUrl = `${authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=token${scopeParam}`;

    chrome.identity.launchWebAuthFlow({ url: fullAuthUrl, interactive: true }, (responseUrl) => {
      if (chrome.runtime.lastError || !responseUrl) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Authorization failed.' });
        return;
      }
      const fragment = new URL(responseUrl).hash.substring(1);
      const params = new URLSearchParams(fragment);
      const token = params.get('access_token');
      if (token) {
        chrome.storage.local.set({
          cloud_sync_provider: provider,
          cloud_access_token: token
        }, () => {
          sendResponse({ success: true, token });
        });
      } else {
        sendResponse({ success: false, error: 'Access token not found.' });
      }
    });

    return true; // async
  }

  if (message.action === 'CLOUD_DISCONNECT') {
    chrome.storage.local.set({
      cloud_sync_provider: 'none',
      cloud_access_token: null,
      cloud_last_sync_time: null
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'GENERATE_APPLICATION') {
    const { jobDescription, tabUrl } = message;

    (async () => {
      try {
        // 1. Get settings and master resume from storage
        const settings = await getStorageData(['settings', 'masterResume']);

        if (!settings.settings?.openAiKey) {
          throw new Error('OpenAI API key not configured. Please add it in settings.');
        }

        if (!settings.masterResume) {
          throw new Error('Master resume not found. Please upload your master resume first.');
        }

        // 2. Extract PII profile and mask resume
        const piiProfile = extractPIIProfile(settings.masterResume);
        const maskedResume = maskPII(settings.masterResume, piiProfile);

        // 3. Call OpenAI API
        // Determine category for certification rules
        const category = classifyCategory(jobDescription);
        const hasFoodHandling = /food\s*(handle|safe|safety|handler)|kitchen\s*(safe|safety)|safe\s*check/i.test(jobDescription);

        const prompt = `You are an expert ATS resume and cover letter writer. Follow these instructions EXACTLY.

## CATEGORIZATION RULES (CRITICAL):
- Category "${category}" determined from job description
- ${category === '3_kitchen_cook' && hasFoodHandling ? 'INCLUDE the "SafeCheck Advanced Food Safety Certification" in the Certifications section (food handling duties detected)' : 'Do NOT include any food safety certifications for this category'}
- Categories 1_tech_support and 2_general_basic: NEVER include food safety certifications

## LAYOUT RULES (CRITICAL):
- Use ONLY block-level elements: div, section, h1, h2, h3, ul, li, p, span
- NEVER use: flexbox with column-reverse, CSS grid, float, position: absolute, CSS columns
- Document must flow LINEARLY from top to bottom
- Use ONLY classes defined in the template below
- Use system fonts: Helvetica Neue, Helvetica, Arial, sans-serif (or Times New Roman, Georgia, serif for headers)

## ATS RESUME TEMPLATE:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Resume - [CANDIDATE_NAME]</title>
    <style>
        @page { size: letter; margin: 0.6in; }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #000000; background: #ffffff; }
        }
        body { font-family: Helvetica Neue, Helvetica, Arial, sans-serif; color: #222222; line-height: 1.5; font-size: 11pt; margin: 0; padding: 0; }
        h1 { font-size: 22pt; text-align: center; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; }
        .contact-info { text-align: center; font-size: 10pt; color: #555555; margin-bottom: 24px; line-height: 1.6; }
        h2 { font-size: 11pt; border-bottom: 1.5px solid #222222; margin: 24px 0 12px 0; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
        .summary { margin-bottom: 20px; }
        .summary p { margin: 0; text-align: justify; font-size: 10.5pt; line-height: 1.6; }
        .skills-list { margin: 0 0 20px 0; padding: 0; list-style: none; }
        .skills-list li { margin-bottom: 6px; font-size: 10.5pt; }
        .skills-list li strong { color: #111111; font-weight: 600; }
        .job-entry { margin-bottom: 18px; page-break-inside: avoid; }
        .job-header { margin-bottom: 8px; display: block; position: relative; }
        .job-title-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
        .company-name { font-weight: 700; font-size: 11pt; color: #111111; }
        .job-date-location { display: block; font-weight: normal; font-style: normal; color: #666666; font-size: 9.5pt; margin-top: 2px; }
        .job-title { font-style: italic; font-weight: 500; color: #333333; text-align: right; flex-shrink: 0; }
        ul.achievements { margin: 0; padding-left: 18px; }
        ul.achievements li { margin-bottom: 5px; text-align: justify; font-size: 10.5pt; line-height: 1.5; }
        .edu-entry { margin-bottom: 10px; page-break-inside: avoid; font-size: 10.5pt; }
        .cert-entry { margin-bottom: 10px; }
    </style>
</head>
<body>
    <h1>[CANDIDATE_NAME]</h1>
    <div class="contact-info">[Phone] • [Email] • Availability: [Statement]</div>
    <h2>Professional Summary</h2>
    <div class="summary"><p>[3-sentence tailored summary]</p></div>
    <h2>Skills</h2>
    <ul class="skills-list">
        <li><strong>[Category]</strong>: [Skills]</li>
    </ul>
    <h2>Professional Experience</h2>
    <div class="job-entry">
        <div class="job-header">
            <div class="job-title-row">
                <span class="company-name">[Company]</span>
                <span class="job-title">[Title]</span>
            </div>
            <span class="job-date-location">[Dates] | [Location]</span>
        </div>
        <ul class="achievements"><li>[Bullet 1]</li><li>[Bullet 2]</li></ul>
    </div>
    <h2>Education</h2>
    <div class="edu-entry"><span class="job-date-location">[Year]</span><span class="company-name">[Degree]</span> – <span class="job-title">[School]</span></div>
    ${category === '3_kitchen_cook' && hasFoodHandling ? '<h2>Certifications</h2><div class="cert-entry">SafeCheck Advanced Food Safety Certification</div>' : ''}
</body>
</html>
\`\`\`

## ATS COVER LETTER TEMPLATE:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Cover Letter - [CANDIDATE_NAME]</title>
    <style>
        @page { size: letter; margin: 1.0in; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        body { font-family: Helvetica Neue, Helvetica, Arial, sans-serif; color: #222222; line-height: 1.5; font-size: 11pt; margin: 0; padding: 0; }
        .sender-name { font-size: 16pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
        .sender-meta { color: #555555; font-size: 10pt; }
        p { margin: 0 0 16px 0; text-align: justify; font-size: 11pt; line-height: 1.6; }
        .signature-space { margin-top: 40px; }
    </style>
</head>
<body>
    <div class="sender-name">[CANDIDATE_NAME]</div>
    <div class="sender-meta">[Phone] | [Email]</div>
    <p>[Date]</p>
    <p>Hiring Selection Team<br>[Company]<br>[Address]</p>
    <p>RE: Application for [Job Title]</p>
    <p>Dear Hiring Team at [Company],</p>
    <p>[Opening paragraph - express interest]</p>
    <p>[Body paragraph 1 - relevant experience]</p>
    <p>[Body paragraph 2 - skills and fit]</p>
    <p>[Closing paragraph - call to action]</p>
    <div class="signature-space">Sincerely,<br><br><strong>[CANDIDATE_NAME]</strong></div>
</body>
</html>
\`\`\`

## MASKED CANDIDATE INFO (demask these):
- [CANDIDATE_NAME] → ${piiProfile.name || 'the candidate'}
- [CANDIDATE_PHONE] → ${piiProfile.phone || 'phone number'}
- [CANDIDATE_EMAIL] → ${piiProfile.email || 'email address'}
- [CANDIDATE_LINK] → ${piiProfile.links ? piiProfile.links.join(', ') : 'links'}

## MASTER RESUME (masked):
${maskedResume}

## JOB DESCRIPTION:
${jobDescription}

Generate valid JSON with exact structure:
{
  "resumeHtml": "<!DOCTYPE html>...full resume HTML using template above...",
  "coverLetterHtml": "<!DOCTYPE html>...full cover letter HTML using template above...",
  "companyName": "Company Name",
  "jobTitle": "Job Title"
}

CRITICAL:
- Output ONLY valid JSON, no markdown code blocks
- Use ONLY the templates provided above
- Replace [CANDIDATE_*] placeholders with actual values after generation
- Include realistic bullets based on job description requirements`;

        const response = await fetch('https://api.minimax.chat/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.settings.openAiKey}`
          },
          body: JSON.stringify({
            model: 'MiniMax-M2.7',
            messages: [
              {
                role: 'system',
                content: 'You are an expert HR assistant that generates ATS-optimized resumes and cover letters. Always respond with valid JSON only.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 8000
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`MiniMax API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        let rawContent = data.choices[0]?.message?.content || '';

        // Clean up any markdown code blocks
        rawContent = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

        // 4. Parse JSON and demask PII
        let parsed;
        try {
          parsed = JSON.parse(rawContent);
        } catch (parseError) {
          console.error('Failed to parse LLM response:', rawContent);
          throw new Error('Failed to parse LLM response. Please try again.');
        }

        // Demask PII in the generated content
        parsed.resumeHtml = demaskPII(parsed.resumeHtml, piiProfile);
        parsed.coverLetterHtml = demaskPII(parsed.coverLetterHtml, piiProfile);

        // 5. Save application to storage
        const categoryFinal = classifyCategory(jobDescription);
        const folderName = generateFolderName(parsed.companyName, parsed.jobTitle);
        const categoryKey = `${categoryFinal}/${folderName}`;

        const existingApps = (await getStorageData('applications')) || {};

        const newApplication = {
          company: parsed.companyName,
          job_title: parsed.jobTitle,
          date_applied: new Date().toISOString().split('T')[0],
          status: 'prospect',
          response_date: null,
          notes: '',
          contact_name: null,
          contact_email: null,
          source: 'Extension',
          documents: [],
          job_url: tabUrl || null,
          category,
          category_key: category,
          category_name: getCategoryName(category),
          category_color: getCategoryColor(category),
          folder: folderName,
          path: categoryKey,
          has_job_description: true,
          has_resume: true,
          has_cover_letter: true,
          days_since_applied: 0,
          needs_followup: true,
          files: []
        };

        existingApps[categoryKey] = newApplication;
        await setStorageData({ applications: existingApps });

        // 6. Save document HTMLs
        const docKeyResume = `doc_${category}/${folderName}/resume`;
        const docKeyCover = `doc_${category}/${folderName}/cover_letter`;
        const docKeyJobDesc = `doc_${category}/${folderName}/job_description`;

        await setStorageData({
          [docKeyResume]: parsed.resumeHtml,
          [docKeyCover]: parsed.coverLetterHtml,
          [docKeyJobDesc]: `<html><body><pre>${jobDescription}</pre></body></html>`
        });

        // 7. Return success with new job info
        sendResponse({
          success: true,
          job: newApplication,
          message: `Application for ${parsed.companyName} created successfully!`
        });

      } catch (error) {
        console.error('Error generating application:', error);
        sendResponse({
          success: false,
          error: error.message || 'Failed to generate application'
        });
      }
    })();

    return true; // async response
  }

  if (message.action === 'ASSISTANT_QUERY') {
    const { question, jobDescription, resumeHtml } = message;

    (async () => {
      try {
        const settings = await getStorageData(['settings']);

        if (!settings.settings?.openAiKey) {
          throw new Error('OpenAI API key not configured. Please add it in settings.');
        }

        const piiProfile = resumeHtml ? extractPIIProfile(resumeHtml) : {};
        const maskedResume = resumeHtml ? maskPII(resumeHtml, piiProfile) : '';

        const prompt = `You are an expert job application assistant helping a candidate with their job application.

## JOB DESCRIPTION:
${jobDescription || 'No job description available.'}

## USER'S RESUME (masked for PII protection):
${maskedResume || 'No resume available.'}

## USER'S QUESTION:
${question}

Based on the job description and resume, provide a helpful, specific answer to the user's question.
Focus on:
- How their experience matches the job requirements
- Specific skills or qualifications they should highlight
- Potential concerns and how to address them
- Suggestions for tailoring their application

Be concise but informative. Answer directly.`;

        const response = await fetch('https://api.minimax.chat/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.settings.openAiKey}`
          },
          body: JSON.stringify({
            model: 'MiniMax-M2.7',
            messages: [
              {
                role: 'system',
                content: 'You are an expert HR assistant helping job seekers with their applications. Be helpful, specific, and actionable.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2000
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`MiniMax API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const answer = data.choices[0]?.message?.content || '';

        sendResponse({ success: true, answer });
      } catch (error) {
        console.error('Error in ASSISTANT_QUERY:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // async response
  }

  if (message.action === 'CLOUD_BACKGROUND_SYNC') {
    // Background sync triggered by alarm — delegate to cloud-sync.ts logic
    // The side panel/page will pick up this message and run syncToCloud
    sendResponse({ received: true });
    return true;
  }

  return false;
});

function getCategoryName(key) {
  const names = {
    '1_tech_support': 'Tech Support',
    '2_general_basic': 'General',
    '3_kitchen_cook': 'Kitchen'
  };
  return names[key] || 'General';
}

function getCategoryColor(key) {
  const colors = {
    '1_tech_support': '#0d6efd',
    '2_general_basic': '#198754',
    '3_kitchen_cook': '#fd7e14'
  };
  return colors[key] || '#198754';
}

async function uploadToGDrive(token, payload) {
  console.log('Upload to GDrive called with payload:', payload);
  return { success: true };
}