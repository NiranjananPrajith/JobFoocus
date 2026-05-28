// src/lib/db/index.ts
// Direct Supabase CRUD layer — replaces chrome.storage.local / localStorage
// RLS enforces auth.uid() = user_id on all tables

import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Client helpers
// ---------------------------------------------------------------------------
export function getClient() {
  return createBrowserClient();
}

async function getServerClient() {
  return createServerClient();
}

function isServerSide(): boolean {
  return typeof window === 'undefined';
}

async function getDb() {
  if (isServerSide()) {
    return getServerClient();
  }
  return getClient();
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export async function dbGetApplications(userId: string) {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('applications')
    .select('category, folder, data')
    .eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function dbGetApplication(userId: string, category: string, folder: string) {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('applications')
    .select('category, folder, data')
    .eq('user_id', userId)
    .eq('category', category)
    .eq('folder', folder)
    .single();
  if (error?.code === 'PGRST116') return null;
  if (error) throw error;
  return data ?? null;
}

export async function dbUpsertApplication(userId: string, category: string, folder: string, appData: unknown) {
  const supabase = await getServerClient();
  const { error } = await supabase
    .from('applications')
    .upsert(
      { user_id: userId, category, folder, data: appData },
      { onConflict: 'user_id,category,folder' }
    );
  if (error) throw error;
}

export async function dbDeleteApplication(userId: string, category: string, folder: string) {
  const supabase = await getServerClient();
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('user_id', userId)
    .eq('category', category)
    .eq('folder', folder);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function dbGetDocument(userId: string, category: string, folder: string, docType: string) {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('documents')
    .select('html')
    .eq('user_id', userId)
    .eq('category', category)
    .eq('folder', folder)
    .eq('doc_type', docType)
    .single();
  if (error?.code === 'PGRST116') return null;
  if (error) throw error;
  return data?.html ?? null;
}

export async function dbSaveDocument(userId: string, category: string, folder: string, docType: string, html: string) {
  const supabase = await getServerClient();
  const { error } = await supabase
    .from('documents')
    .upsert(
      { user_id: userId, category, folder, doc_type: docType, html },
      { onConflict: 'user_id,category,folder,doc_type' }
    );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Master Resume
// ---------------------------------------------------------------------------

export async function dbGetMasterResume(userId: string) {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('master_resumes')
    .select('data')
    .eq('user_id', userId)
    .single();
  if (error?.code === 'PGRST116') return null;
  if (error) throw error;
  return data?.data ?? null;
}

export async function dbSetMasterResume(userId: string, resumeData: unknown) {
  const supabase = await getServerClient();
  const { error } = await supabase
    .from('master_resumes')
    .upsert(
      { user_id: userId, data: resumeData },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function dbGetSettings(userId: string) {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('settings')
    .select('cloud_provider, sync_enabled, openai_key')
    .eq('user_id', userId)
    .single();
  if (error?.code === 'PGRST116') return null;
  if (error) throw error;
  if (!data) return { cloudProvider: 'none', syncEnabled: false, openAiKey: '' };
  return {
    cloudProvider: data.cloud_provider,
    syncEnabled: data.sync_enabled,
    openAiKey: data.openai_key ?? '',
  };
}

export async function dbSetSettings(userId: string, s: { cloudProvider: string; syncEnabled: boolean; openAiKey: string }) {
  const supabase = await getServerClient();
  const { error } = await supabase
    .from('settings')
    .upsert(
      {
        user_id: userId,
        cloud_provider: s.cloudProvider,
        sync_enabled: s.syncEnabled,
        openai_key: s.openAiKey,
      },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Bulk Export / Import
// ---------------------------------------------------------------------------

export async function dbExportAllData(userId: string) {
  const supabase = await getServerClient();

  const [appsResult, docsResult, mrResult, settingsResult] = await Promise.all([
    supabase.from('applications').select('category, folder, data').eq('user_id', userId),
    supabase.from('documents').select('category, folder, doc_type, html').eq('user_id', userId),
    supabase.from('master_resumes').select('data').eq('user_id', userId).single(),
    supabase.from('settings').select('cloud_provider, sync_enabled, openai_key').eq('user_id', userId).single(),
  ]);

  const data: Record<string, unknown> = {};

  const apps: Record<string, unknown> = {};
  for (const row of appsResult.data ?? []) {
    apps[`${row.category}/${row.folder}`] = row.data;
  }
  data['applications'] = apps;

  for (const row of docsResult.data ?? []) {
    data[`doc_${row.category}/${row.folder}/${row.doc_type}`] = row.html;
  }

  if (mrResult.data) data['masterResume'] = mrResult.data.data;
  if (settingsResult.data) {
    data['settings'] = {
      cloudProvider: settingsResult.data.cloud_provider,
      syncEnabled: settingsResult.data.sync_enabled,
      openAiKey: settingsResult.data.openai_key,
    };
  }

  return data;
}

export async function dbImportAllData(userId: string, incoming: Record<string, unknown>, strategy: 'overwrite' | 'merge') {
  const supabase = await getServerClient();

  if (strategy === 'overwrite') {
    await Promise.all([
      supabase.from('applications').delete().eq('user_id', userId),
      supabase.from('documents').delete().eq('user_id', userId),
      supabase.from('master_resumes').delete().eq('user_id', userId),
      supabase.from('settings').delete().eq('user_id', userId),
    ]);
  }

  const applications = incoming['applications'] as Record<string, unknown> | undefined;
  if (applications) {
    for (const [key, value] of Object.entries(applications)) {
      const slashIdx = key.indexOf('/');
      if (slashIdx === -1) continue;
      const category = key.slice(0, slashIdx);
      const folder = key.slice(slashIdx + 1);
      await dbUpsertApplication(userId, category, folder, value);
    }
  }

  for (const [key, html] of Object.entries(incoming)) {
    if (!key.startsWith('doc_')) continue;
    const remainder = key.slice(4);
    const lastSlash = remainder.lastIndexOf('/');
    if (lastSlash === -1) continue;
    const docType = remainder.slice(lastSlash + 1);
    const path = remainder.slice(0, lastSlash);
    const slashIdx = path.indexOf('/');
    if (slashIdx === -1) continue;
    const category = path.slice(0, slashIdx);
    const folder = path.slice(slashIdx + 1);
    await dbSaveDocument(userId, category, folder, docType, html as string);
  }

  const masterResume = incoming['masterResume'];
  if (masterResume) await dbSetMasterResume(userId, masterResume);

  const settings = incoming['settings'] as { cloudProvider: string; syncEnabled: boolean; openAiKey: string } | undefined;
  if (settings) await dbSetSettings(userId, settings);

  return { success: true, itemsImported: Object.keys(incoming).length };
}
