# Job Application Automation Project (Next.js Edition)

## System Overview
This project automates the creation, tailoring, and organization of job applications based on a user-provided Master Resume (`base_materials/master_resume.html`), Contact Information (`base_materials/contact_info.html`), and a target Job Description. The generated documents are parsed natively by the Next.js app, served inside a webview dashboard, and compiled to PDF using the browser's native print framework.

## Category Classification & Priorities
When given a job description, classify it into one of these three targeted folders:
1. `applications/1_tech_support/` (TOP PRIORITY) - IT helpdesk, desktop support, technical customer service.
2. `applications/2_general_basic/` (MEDIUM PRIORITY) - Cashier, stock associate, fast food (McDonalds, Tim Hortons, etc.).
3. `applications/3_kitchen_cook/` (LOW PRIORITY) - Line cook, kitchen helper, food prep.

## Workflow for New Job Applications
When the user provides a job description, execute the following steps sequentially:

1. **Classify the Role**: Determine if it belongs to category 1, 2, or 3.
2. **Create Target Directory**: Create a folder inside the correct category using the format: `YYYY-MM-DD_[Company]_[JobTitle]`.
3. **Save Job Description**: Save the raw text provided by the user as `job_description.html` inside that new folder.
4. **Draft Tailored Resume**: Read `base_materials/master_resume.html` and generate a highly tailored `resume.html` optimized for target keywords matching the structural layout below.
5. **Draft Cover Letter**: Generate a compelling `cover_letter.html` addressing the hiring manager using the structural template below.
6. **Create Tracking File**: Create `application.json` with fields: `company`, `job_title`, `date_applied`, `status` (default: "prospect"), `source`, `contact_name`, `contact_email`, `notes`, and `response_date`.

## Next.js UI Application
The tracker dashboard and document webview are served natively via the Next.js development environment.
* **Run Web Application**:
  ```bash
  npm run dev
  # or: pnpm dev / yarn dev

```

* **Dashboard Access (Production)**: Click the extension icon in Chrome → the dashboard opens in an extension tab at `chrome-extension://<id>/index.html`. This is the production UI and uses `chrome.storage.local` (extension isolated storage).

* **Local Dev Server**: Run `npm run dev` and open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) only for live-reload design testing. **Data is separate** — localhost uses browser `localStorage`, so any data created there will NOT appear in the production extension dashboard and vice versa.

* **Document Viewer Tab Title**: When viewing a document, the browser tab displays the document name in the format `{folder}_Resume` or `{folder}_CoverLetter` (e.g., `2026-05-23_RONA_CustomerServiceAssociate_Resume`).

## Document Printing & ATS Optimization Rules

* **Browser Print Engineering**: All documents must incorporate self-contained CSS styles that natively hook into browser print settings via `@page` structures. Use `-webkit-print-color-adjust: exact;` to ensure structural borders and layout dividers print perfectly.
* **No Layout Floats or Columns**: Text must flow linearly from top to bottom within simple block wrappers (`<div>`, `<section>`). Do not use flex-direction column-reverse, CSS multi-columns, or complex grid matrix systems that trick or break automated parsing spiders.
* **Conditional Certifications**: Include the `SafeCheck Advanced Food Safety Certification` ONLY for Category 3 (Kitchen / Cook) and applications containing explicit food-handling duties. Omit it completely from Category 1 (Tech Support) and Category 2 (General Basic) to maintain maximum resume relevance.

---

## 📄 ATS Resume Structural Template (`resume.html`)

*When creating `resume.html`, populate this exact HTML template string using data pulled from your base files and embed custom keywords directly into the structural blocks:*

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Resume - [INSERT FULL NAME]</title>
    <style>
        @page {
            size: letter;
            margin: 0.6in;
        }
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color: #000000;
                background: #ffffff;
            }
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #222222;
            line-height: 1.5;
            font-size: 11pt;
            margin: 0;
            padding: 0;
        }
        h1 {
            font-size: 22pt;
            text-align: center;
            margin: 0 0 6px 0;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 700;
        }
        .contact-info {
            text-align: center;
            font-size: 10pt;
            color: #555555;
            margin-bottom: 24px;
            line-height: 1.6;
        }
        h2 {
            font-size: 11pt;
            border-bottom: 1.5px solid #222222;
            margin: 24px 0 12px 0;
            padding-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
        }
        .summary {
            margin-bottom: 20px;
        }
        .summary p {
            margin: 0;
            text-align: justify;
            font-size: 10.5pt;
            line-height: 1.6;
            color: #333333;
        }
        .skills-list {
            margin: 0 0 20px 0;
            padding: 0;
            list-style: none;
        }
        .skills-list li {
            margin-bottom: 6px;
            font-size: 10.5pt;
        }
        .skills-list li strong {
            color: #111111;
            font-weight: 600;
        }
        .job-entry {
            margin-bottom: 18px;
            page-break-inside: avoid;
        }
        .job-header {
            margin-bottom: 8px;
            display: block;
            position: relative;
        }
        .job-title-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 12px;
        }
        .company-name {
            font-weight: 700;
            font-size: 11pt;
            color: #111111;
        }
        .job-date-location {
            display: block;
            font-weight: normal;
            font-style: normal;
            color: #666666;
            font-size: 9.5pt;
            margin-top: 2px;
        }
        .job-title {
            font-style: italic;
            font-weight: 500;
            color: #333333;
            text-align: right;
            flex-shrink: 0;
        }
        .clear {
            clear: both;
        }
        ul.achievements {
            margin: 0;
            padding-left: 18px;
        }
        ul.achievements li {
            margin-bottom: 5px;
            text-align: justify;
            font-size: 10.5pt;
            line-height: 1.5;
        }
        .edu-entry {
            margin-bottom: 10px;
            page-break-inside: avoid;
            font-size: 10.5pt;
        }
        .edu-entry .job-date-location {
            float: none;
            display: block;
            margin-bottom: 2px;
        }
        .edu-entry .company-name {
            font-weight: 600;
        }
        .edu-entry .job-title {
            font-style: normal;
            color: #444444;
        }
    </style>
</head>
<body>

    <h1>[INSERT FULL NAME]</h1>
    <div class="contact-info">
        [Phone Number] &bull; [Email Address] <br>
        Availability: [Insert Availability Statement]
    </div>

    <h2>Professional Summary</h2>
    <div class="summary">
        <p>[Insert tailored high-impact 3-sentence summary matching the target category role requirements.]</p>
    </div>

    <h2>Skills</h2>
    <ul class="skills-list">
        <li><strong>[Core Technical/Operational Core]</strong>: [Skill 1], [Skill 2], [Skill 3], [Skill 4]</li>
        <li><strong>[Tools, Platforms & Systems]</strong>: [Skill 1], [Skill 2], [Skill 3]</li>
        <li><strong>[Methodologies & Standards]</strong>: [Skill 1], [Skill 2]</li>
    </ul>

    <h2>Professional Experience</h2>

    <div class="job-entry">
        <div class="job-header">
            <div class="job-title-row">
                <span class="company-name">[Company Name]</span>
                <span class="job-title">[Tailored Job Title]</span>
            </div>
            <span class="job-date-location">[Month YYYY] &ndash; [Month YYYY] | [City, Province]</span>
        </div>
        <ul class="achievements">
            <li>[Tailored achievement bullet incorporating hard action verbs and target JD keywords.]</li>
            <li>[Metric-driven historical performance bullet pulled directly from the master asset profile.]</li>
            <li>[Operational consistency, ticketing queue efficiency, or kitchen speed bullet.]</li>
            <li>[Collaborative or cross-functional duty alignment string item.]</li>
        </ul>
    </div>

    <div class="job-entry">
        <div class="job-header">
            <div class="job-title-row">
                <span class="company-name">[Next Company Name]</span>
                <span class="job-title">[Tailored Job Title]</span>
            </div>
            <span class="job-date-location">[Month YYYY] &ndash; [Month YYYY] | [City, Province]</span>
        </div>
        <ul class="achievements">
            <li>[Tailored performance highlight focusing on adaptability, precision, or fast-paced volume execution.]</li>
            <li>[Standalone capability or cash/drawer audit validation milestone entry.]</li>
            <li>[Client interaction or workflow safety tracking item.]</li>
        </ul>
    </div>

    <h2>Education</h2>
    <div class="edu-entry">
        <span class="job-date-location">[Year] &ndash; [Year]</span>
        <span class="company-name">[Diploma / Degree / Certificate Title]</span> &ndash; <span class="job-title">[Institution Name], [City, Province/Country]</span>
    </div>

    <h2>Certifications</h2>
    <div class="cert-entry">
        [Conditional Certification Line Items]
    </div>

</body>
</html>

```

---

## ✉️ ATS Cover Letter Structural Template (`cover_letter.html`)

*When building `cover_letter.html`, use this responsive layout optimized for default printing page dimensions:*

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cover Letter - [INSERT FULL NAME]</title>
    <style>
        @page {
            size: letter;
            margin: 1.0in;
        }
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color: #000000;
                background: #ffffff;
            }
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #222222;
            line-height: 1.5;
            font-size: 11pt;
            margin: 0;
            padding: 0;
        }
        .sender-block {
            margin-bottom: 28px;
        }
        .sender-name {
            font-size: 16pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 6px;
            color: #111111;
        }
        .sender-meta {
            color: #555555;
            font-size: 10pt;
            line-height: 1.5;
        }
        .date-block {
            margin-bottom: 22px;
            font-size: 10.5pt;
        }
        .recipient-block {
            margin-bottom: 28px;
        }
        .recipient-block strong {
            font-size: 11pt;
            color: #111111;
        }
        .subject-block {
            font-weight: 700;
            margin-bottom: 24px;
            text-transform: uppercase;
            font-size: 10.5pt;
            letter-spacing: 0.5px;
            color: #111111;
        }
        p {
            margin: 0 0 16px 0;
            text-align: justify;
            font-size: 11pt;
            line-height: 1.6;
        }
        .signature-space {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        .signature-space strong {
            font-weight: 600;
        }
    </style>
</head>
<body>

    <div class="sender-block">
        <div class="sender-name">[INSERT FULL NAME]</div>
        <div class="sender-meta">[Phone Number] | [Email Address]</div>
    </div>

    <div class="date-block">
        [Current Date - Format: Month DD, 2026]
    </div>

    <div class="recipient-block">
        Hiring Selection Team<br>
        <strong>[Target Company Name]</strong><br>
        [Company Street Address / City, Province]
    </div>

    <div class="subject-block">
        RE: Application for the position of [Target Job Title]
    </div>

    <p>Dear Hiring Team at [Target Company Name],</p>

    <p>I am writing to express my strong interest in the [Target Job Title] position at [Target Company Name]. Backed by a solid background in [mention 1-2 core competencies tailored to the tier, e.g., Tier 2 hardware/software troubleshooting or high-volume line management], I am fully prepared to step into this role immediately. My open availability across days, nights, and weekends ensures that I can seamlessly support your team's operational schedule from day one.</p>

    <p>Throughout my career, I have focused on driving efficiency and resolving challenges under pressure. During my time at [Primary Past Employer matching the industry], I successfully [insert a core metric or achievement, e.g., maintained top-tier CSAT scores while reducing team escalation rates as a Floorwalker / managed high-intensity Broil and Sauté stations during peak lunch and dinner rush hours with exceptionally low waste rates]. I excel at rapidly analyzing situational needs, navigating fast-paced queue/floor demands, and ensuring total compliance with organizational standards.</p>

    <p>In addition to my direct industry capabilities, my broader experience has instilled in me an adaptive workflow and elite multitasking skills. Whether independently managing solo overnight storefront operations with 100% data accuracy or resolving technical bugs under tight constraints, I approach challenges with a solutions-oriented mindset. I am eager to apply this proactive work ethic to help [Target Company Name] maintain its high standards of customer service and operational productivity.</p>

    <p>Thank you for your time and consideration of my application. I would welcome the opportunity to discuss how my tailored skills and immediate availability can contribute to the continued success of your team. I am available for an interview at your earliest convenience and can be reached directly at [Phone Number] or via email at [Email Address].</p>

    <div class="signature-space">
        Sincerely,<br><br><br>
        <strong>[INSERT FULL NAME]</strong>
    </div>

</body>
</html>

```

### 💡 NextJS UI Engineering Pro-Tip:
Inside your NextJS webview component where you load these dynamically compiled `.html` files, you can wrap them in a standard `<iframe>` or render them directly using a container with `dangerouslySetInnerHTML`. 

To completely automate the conversion inside the dashboard UI without requiring users to press `Ctrl+P`, you can drop a small floating button onto the panel that executes:
```javascript
// Triggers the browser print utility targeting exclusively the webview node context
window.print();