# JobFoocus

A Next.js-based job application automation system that helps you create, tailor, and organize job applications from a master resume.

## Features

- **AI Document Generation**: Generates ATS-optimized resumes and cover letters customized for each job description
- **Smart Categorization**: User-defined categories with AI auto-classification based on job title, company, and description
- **Dashboard Tracking**: Visual tracker for monitoring job application status and progress
- **PDF Export**: Browser-native print-to-PDF with optimized print styles

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `src/lib/storage-adapter.ts` — Client-side storage layer (localStorage-first, syncs to server via API routes)
- `supabase/migrations/` — Database schema (Postgres + RLS)
- `src/app/api/` — API routes (applications, documents, categories, settings, master-resume)
- `src/` — Next.js application source

## Architecture

- **Storage**: The client-side storage adapter (`src/lib/storage-adapter.ts`) reads/writes to localStorage and syncs to Supabase through Next.js API routes
- **Database**: Supabase (Postgres) with Row-Level Security — schema managed via migrations in `supabase/migrations/`
- **Auth**: Supabase Auth for authentication
