# JobFoocus Extension

A Next.js-based job application automation system that helps you create, tailor, and organize job applications from a master resume.

## Features

- **Smart Classification**: Automatically categorizes job applications into Tech Support, General Basic, or Kitchen/Cook roles
- **Tailored Documents**: Generates ATS-optimized resumes and cover letters customized for each job description
- **Dashboard Tracking**: Visual tracker for monitoring job application status and progress
- **PDF Export**: Browser-native print-to-PDF with optimized print styles

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `base_materials/` - Your master resume and contact info
- `applications/` - Generated tailored applications (created automatically)
- `src/` - Next.js application source

## Workflow

1. Place your master resume in `base_materials/master_resume.html`
2. Place your contact info in `base_materials/contact_info.html`
3. Run the app and paste a job description
4. The system classifies the role, creates targeted documents, and adds it to your tracker dashboard