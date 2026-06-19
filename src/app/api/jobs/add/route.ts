// POST /api/jobs/add
//
// Server-side job addition pipeline with atomic usage enforcement.
// The gate check (tryIncrement) and the counter bump happen in the
// same request as the actual work — no client-side fire-and-forget,
// no race conditions, no bypass.
//
// Flow:
//   1. Authenticate (cookie-bound client)
//   2. tryIncrement('add_job') — atomic gate + bump
//   3. Fetch master resume from Supabase
//   4. Format JD (or use pre-formatted JD from client)
//   5. Save application + JD document
//   6. Classify to category (if user has categories)
//   7. Generate resume + cover letter (with PII masking)
//   8. Save documents + update doc flags
//   9. Return success + app URL

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-utils/server';
import { createServiceClient } from '@/lib/supabase-utils/service';
import { getEffectiveTier } from '@/lib/subscription';
import { tryIncrement } from '@/lib/usage';
import {
  formatJobDescription,
  classifyJobToCategory,
  generateResumeHTML,
  generateCoverLetterHTML,
  buildResumeFullHTML,
  buildJobDescriptionHTML,
  wrapCoverLetterHTML,
  type FormattedJD,
} from '@/lib/ai-generation';
import { maskPII, demaskPII, extractPIIProfile } from '@/lib/pii-utils';

export const dynamic = 'force-dynamic';

interface RequestBody {
  jdText?: string;
  category?: string;
  source?: string;
  jobUrl?: string | null;
  formattedJD?: FormattedJD;
  folder?: string;
}

export async function POST(request: Request) {
  // ---- 1. Authenticate ----
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---- Parse body ----
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { jdText, category = 'Uncategorized', source = 'Added Manually', jobUrl = null, formattedJD: preFormattedJD, folder: clientFolder } = body;

  if (!jdText && !preFormattedJD) {
    return NextResponse.json(
      { error: 'Either jdText or formattedJD is required.' },
      { status: 400 }
    );
  }

  // ---- 2. Atomic gate + increment ----
  const { tier, limits } = await getEffectiveTier(user.id);
  const gateResult = await tryIncrement(user.id, 'add_job', limits);

  if (!gateResult.ok) {
    return NextResponse.json(
      {
        error: 'limit_reached',
        tier,
        jobsLimit: limits.jobs,
        editsLimit: limits.edits,
      },
      { status: 402 }
    );
  }

  try {
    // ---- 3. Fetch master resume ----
    const { data: resumeRow } = await supabase
      .from('master_resumes')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle();

    const masterResume = resumeRow?.data;
    if (!masterResume) {
      return NextResponse.json(
        { error: 'Master resume not found. Please fill in your Master Resume first.' },
        { status: 400 }
      );
    }

    // ---- 4. Format JD ----
    const formatted = preFormattedJD || await formatJobDescription(jdText!);
    console.log('[jobs-add] JD formatted:', formatted.company, formatted.job_title);

    const folder = clientFolder || 'job-' + Date.now();

    // ---- 5. Look up category ID ----
    const { data: catRows } = await supabase
      .from('user_categories')
      .select('id, name, color')
      .eq('user_id', user.id);

    const categories = catRows || [];
    const catMap = new Map(categories.map(c => [c.name.toLowerCase(), c]));
    const catInfo = catMap.get(category.toLowerCase());
    const categoryId = catInfo?.id || null;

    // ---- 6. Save application ----
    const appData = {
      company: formatted.company,
      job_title: formatted.job_title,
      date_applied: '',
      status: 'prospect',
      response_date: null,
      notes: '',
      contact_name: null,
      contact_email: null,
      source,
      documents: [],
      job_url: jobUrl,
    };

    // Build the enriched data shape that the storage adapter uses.
    const enrichedData = {
      ...appData,
      category,
      category_id: categoryId || '',
      category_key: category,
      category_name: catInfo?.name || category,
      category_color: catInfo?.color || '#888888',
      folder,
      path: `${category}/${folder}`,
      has_job_description: true,
      has_resume: false,
      has_cover_letter: false,
      days_since_applied: 0,
      needs_followup: false,
      files: [],
    };

    if (categoryId) {
      const { error } = await supabase
        .from('applications')
        .upsert(
          { user_id: user.id, category, category_id: categoryId, folder, data: enrichedData },
          { onConflict: 'user_id,category_id,folder' }
        );
      if (error) {
        console.error('[jobs-add] save application failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from('applications')
        .upsert(
          { user_id: user.id, category: category || 'Uncategorized', folder, data: enrichedData },
          { onConflict: 'user_id,category,folder' }
        );
      if (error) {
        console.error('[jobs-add] save application failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // ---- 7. Save JD document ----
    const jdHTML = buildJobDescriptionHTML(formatted, jdText || '');
    if (categoryId) {
      await supabase.from('documents').upsert(
        { user_id: user.id, category, category_id: categoryId, folder, doc_type: 'job_description', html: jdHTML },
        { onConflict: 'user_id,category_id,folder,doc_type' }
      );
    } else {
      await supabase.from('documents').upsert(
        { user_id: user.id, category: category || 'Uncategorized', folder, doc_type: 'job_description', html: jdHTML },
        { onConflict: 'user_id,category,folder,doc_type' }
      );
    }

    // ---- 8. Classify to category (if user has categories and default was used) ----
    let assignedCategory = category;
    if (categories.length > 0 && category === 'Uncategorized') {
      const userCatObjects = categories.map(c => ({
        id: c.id,
        name: c.name,
        description: '',
        color: c.color,
        createdAt: '',
      }));
      assignedCategory = await classifyJobToCategory(formatted, userCatObjects);

      // Re-save the application with the assigned category
      if (assignedCategory !== 'Uncategorized') {
        const newCatInfo = catMap.get(assignedCategory.toLowerCase());
        const newCatId = newCatInfo?.id;
        if (newCatId) {
          enrichedData.category = assignedCategory;
          enrichedData.category_id = newCatId;
          enrichedData.category_name = newCatInfo?.name || assignedCategory;
          enrichedData.category_color = newCatInfo?.color || '#888888';
          await supabase
            .from('applications')
            .update({ category: assignedCategory, category_id: newCatId, data: enrichedData })
            .eq('user_id', user.id)
            .eq('folder', folder);
        }
      }
    }

    // ---- 9. Generate resume + cover letter ----
    const profile = extractPIIProfile({
      name: masterResume.name,
      phone: masterResume.phone,
      email: masterResume.email,
      socials: Array.isArray(masterResume.socials) ? masterResume.socials : [],
      portfolio: masterResume.portfolio,
    });
    const maskedResume = maskPII(JSON.stringify(masterResume), profile);

    let hasResume = false;
    let hasCoverLetter = false;

    try {
      // Resume
      const resumeBodyHTML = await generateResumeHTML(maskedResume, formatted);
      const demaskedResumeBody = demaskPII(resumeBodyHTML, masterResume);
      const resumeFullHTML = buildResumeFullHTML(masterResume, demaskedResumeBody, formatted);

      // Cover letter
      const coverLetterBodyHTML = await generateCoverLetterHTML(maskedResume, formatted);
      const demaskedCoverBody = demaskPII(coverLetterBodyHTML, masterResume);
      const coverLetterFullHTML = wrapCoverLetterHTML(
        masterResume.name || 'Unknown',
        masterResume.phone || '',
        masterResume.email || '',
        formatted,
        demaskedCoverBody
      );

      // Save documents
      const saveCatId = catMap.get(assignedCategory.toLowerCase())?.id;
      if (saveCatId) {
        await supabase.from('documents').upsert(
          { user_id: user.id, category: assignedCategory, category_id: saveCatId, folder, doc_type: 'resume', html: resumeFullHTML },
          { onConflict: 'user_id,category_id,folder,doc_type' }
        );
        await supabase.from('documents').upsert(
          { user_id: user.id, category: assignedCategory, category_id: saveCatId, folder, doc_type: 'cover_letter', html: coverLetterFullHTML },
          { onConflict: 'user_id,category_id,folder,doc_type' }
        );
      } else {
        await supabase.from('documents').upsert(
          { user_id: user.id, category: assignedCategory, folder, doc_type: 'resume', html: resumeFullHTML },
          { onConflict: 'user_id,category,folder,doc_type' }
        );
        await supabase.from('documents').upsert(
          { user_id: user.id, category: assignedCategory, folder, doc_type: 'cover_letter', html: coverLetterFullHTML },
          { onConflict: 'user_id,category,folder,doc_type' }
        );
      }

      hasResume = true;
      hasCoverLetter = true;
      console.log('[jobs-add] documents generated successfully');
    } catch (err) {
      console.error('[jobs-add] document generation error:', err);
      // Continue — the application is saved, just without documents
    }

    // ---- 10. Update doc flags ----
    // Read the existing application data and merge the flags.
    let appRow: any;
    if (categoryId) {
      const { data } = await supabase
        .from('applications')
        .select('data')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .eq('folder', folder)
        .maybeSingle();
      appRow = data;
    } else {
      const { data } = await supabase
        .from('applications')
        .select('data')
        .eq('user_id', user.id)
        .eq('category', category || 'Uncategorized')
        .eq('folder', folder)
        .maybeSingle();
      appRow = data;
    }

    if (appRow?.data) {
      const updatedData = {
        ...appRow.data,
        has_resume: hasResume,
        has_cover_letter: hasCoverLetter,
      };
      if (categoryId) {
        await supabase
          .from('applications')
          .update({ data: updatedData })
          .eq('user_id', user.id)
          .eq('category_id', categoryId)
          .eq('folder', folder);
      } else {
        await supabase
          .from('applications')
          .update({ data: updatedData })
          .eq('user_id', user.id)
          .eq('category', category || 'Uncategorized')
          .eq('folder', folder);
      }
    }

    console.log('[jobs-add] SUCCESS:', formatted.company, formatted.job_title);

    return NextResponse.json({
      success: true,
      category: assignedCategory,
      folder,
      company: formatted.company,
      jobTitle: formatted.job_title,
    });
  } catch (err) {
    console.error('[jobs-add] pipeline error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process job.' },
      { status: 500 }
    );
  }
}
