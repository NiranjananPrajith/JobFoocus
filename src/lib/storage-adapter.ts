import { createClient as createBrowserClient } from '@/lib/supabase/client'

async function getUserId(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const supabase = createBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ---------------------------------------------------------------------------
// API fetch helpers (all server-side via Next.js API routes)
// ---------------------------------------------------------------------------

async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CATEGORIES = {
  '1_tech_support': { name: 'Tech Support', color: '#4a90e2' },
  '2_general_basic': { name: 'General Basic', color: '#4caf50' },
  '3_kitchen_cook': { name: 'Kitchen / Cook', color: '#f5a623' },
} as const;

export type CategoryKey = string;

export const STATUS_CONFIG = {
  prospect: { label: 'Prospect', color: '#888888' },
  applied: { label: 'Applied', color: '#4a90e2' },
  phone_screen: { label: 'Phone Screen', color: '#5ac8fa' },
  interview: { label: 'Interview', color: '#f5a623' },
  offer: { label: 'Offer', color: '#4caf50' },
  rejected: { label: 'Rejected', color: '#e74c3c' },
} as const;

export type StatusKey = keyof typeof STATUS_CONFIG;

export interface ApplicationDocument {
  filename: string;
  original_filename: string;
  upload_date: string;
}

export interface Application {
  company: string;
  job_title: string;
  date_applied: string;
  status: StatusKey;
  response_date: string | null;
  notes: string;
  contact_name: string | null;
  contact_email: string | null;
  source: string;
  documents: ApplicationDocument[];
  job_url: string | null;
}

export interface EnrichedApplication extends Application {
  category: string;
  category_key: CategoryKey;
  category_name: string;
  category_color: string;
  folder: string;
  path: string;
  has_job_description: boolean;
  has_resume: boolean;
  has_cover_letter: boolean;
  days_since_applied: number;
  needs_followup: boolean;
  files: FileInfo[];
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
}

export interface CategoryStats {
  category: string;
  category_key: CategoryKey;
  category_name: string;
  category_color: string;
  count: number;
  by_status: Record<StatusKey, number>;
}

// ---------------------------------------------------------------------------
// Local/fallback storage (chrome.storage.local or localStorage)
// ---------------------------------------------------------------------------

const getExtensionStorage = (): any => {
  if (typeof window === 'undefined') return null;
  if (window.chrome && window.chrome.storage) return window.chrome.storage.local;
  const w = window as any;
  if (w.browser && w.browser.storage) return w.browser.storage.local;
  return null;
};

async function getLocalData(key: string): Promise<any> {
  const storage = getExtensionStorage();
  if (storage) {
    return new Promise((resolve) => {
      storage.get([key], (result: Record<string, unknown>) => resolve(result[key] || null));
    });
  }
  if (typeof localStorage !== 'undefined') {
    const local = localStorage.getItem(key);
    return local ? JSON.parse(local) : null;
  }
  return null;
}

async function setLocalData(key: string, value: any): Promise<void> {
  const storage = getExtensionStorage();
  if (storage) {
    return new Promise((resolve) => {
      storage.set({ [key]: value }, () => resolve());
    });
  }
  localStorage?.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Applications CRUD
// ---------------------------------------------------------------------------

export async function getAllApplications(): Promise<EnrichedApplication[]> {
  const userId = await getUserId();
  if (!userId) {
    const data = await getLocalData('applications');
    if (!data) return [];
    const apps = Object.values(data) as EnrichedApplication[];
    for (const app of apps) {
      const catInfo = (CATEGORIES as Record<string, { name: string; color: string }>)[app.category_key];
      if (catInfo) { app.category_name = catInfo.name; app.category_color = catInfo.color; }
    }
    apps.sort((a, b) => new Date(b.date_applied).getTime() - new Date(a.date_applied).getTime());
    return apps;
  }
  try {
    const rows = await apiFetch('/api/db/applications');
    const apps: EnrichedApplication[] = [];
    for (const row of rows) {
      const app = row.data as EnrichedApplication;
      app.category = row.category;
      app.category_key = row.category as CategoryKey;
      app.folder = row.folder;
      app.path = `${row.category}/${row.folder}`;
      const catInfo = (CATEGORIES as Record<string, { name: string; color: string }>)[app.category_key] || { name: String(app.category_key), color: '#888888' };
      app.category_name = catInfo.name;
      app.category_color = catInfo.color;
      apps.push(app);
    }
    apps.sort((a, b) => new Date(b.date_applied).getTime() - new Date(a.date_applied).getTime());
    return apps;
  } catch (err) {
    console.error('[storage-adapter] getAllApplications failed, falling back to localStorage:', err);
    const data = await getLocalData('applications');
    if (!data) return [];
    const apps = Object.values(data) as EnrichedApplication[];
    for (const app of apps) {
      const catInfo = (CATEGORIES as Record<string, { name: string; color: string }>)[app.category_key];
      if (catInfo) { app.category_name = catInfo.name; app.category_color = catInfo.color; }
    }
    apps.sort((a, b) => new Date(b.date_applied).getTime() - new Date(a.date_applied).getTime());
    return apps;
  }
}

export async function getApplicationById(category: CategoryKey, folderName: string): Promise<EnrichedApplication | null> {
  const userId = await getUserId();
  if (!userId) {
    const key = `${category}/${folderName}`;
    const data = await getLocalData('applications');
    return data?.[key] || null;
  }
  try {
    const row = await apiFetch(`/api/db/applications/${encodeURIComponent(category)}/${encodeURIComponent(folderName)}`);
    if (!row) return null;
    const app = row.data as EnrichedApplication;
    app.category = row.category;
    app.category_key = row.category as CategoryKey;
    app.folder = row.folder;
    app.path = `${row.category}/${row.folder}`;
    return app;
  } catch (err) {
    console.error('[storage-adapter] getApplicationById failed, falling back to localStorage:', err);
    const key = `${category}/${folderName}`;
    const data = await getLocalData('applications');
    return data?.[key] || null;
  }
}

export async function saveApplication(
  category: CategoryKey,
  folderName: string,
  appData: Application
): Promise<void> {
  const userId = await getUserId();
  const key = `${category}/${folderName}`;
  const now = new Date();
  const appliedDate = new Date(appData.date_applied);
  const daysSinceApplied = Math.floor((now.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));

  let existingData: EnrichedApplication | null = null;
  if (userId) {
    try { existingData = await getApplicationById(category, folderName); } catch { /* ignore */ }
  } else {
    const local = await getLocalData('applications');
    existingData = (local?.[key] as EnrichedApplication) || null;
  }

  const enriched: EnrichedApplication = {
    ...appData,
    category: category,
    category_key: category,
    category_name: existingData?.category_name || (CATEGORIES as Record<string, { name: string; color: string }>)[category]?.name || String(category),
    category_color: existingData?.category_color || (CATEGORIES as Record<string, { name: string; color: string }>)[category]?.color || '#888888',
    folder: folderName,
    path: key,
    has_job_description: true,
    has_resume: true,
    has_cover_letter: true,
    days_since_applied: daysSinceApplied,
    needs_followup: ['prospect', 'applied'].includes(appData.status) && daysSinceApplied > 7,
    files: existingData?.files || [],
  };

  if (!userId) {
    const data = (await getLocalData('applications')) || {};
    data[key] = enriched;
    await setLocalData('applications', data);
    return;
  }
  try {
    await apiFetch('/api/db/applications', {
      method: 'POST',
      body: JSON.stringify({ category, folder: folderName, appData: enriched }),
    });
  } catch (err) {
    console.error('[storage-adapter] saveApplication failed, falling back to localStorage:', err);
    const data = (await getLocalData('applications')) || {};
    data[key] = enriched;
    await setLocalData('applications', data);
  }
}

export async function updateApplicationDocFlags(
  category: CategoryKey,
  folderName: string,
  flags: { has_resume?: boolean; has_cover_letter?: boolean }
): Promise<void> {
  const userId = await getUserId();
  const key = `${category}/${folderName}`;
  if (!userId) {
    const existingData = (await getLocalData('applications')) || {};
    const existing = existingData[key] as EnrichedApplication | undefined;
    if (!existing) return;
    existingData[key] = { ...existing, ...flags };
    await setLocalData('applications', existingData);
    return;
  }
  try {
    const row = await apiFetch(`/api/db/applications/${encodeURIComponent(category)}/${encodeURIComponent(folderName)}`);
    if (!row) return;
    const updated = { ...row.data, ...flags };
    await apiFetch('/api/db/applications', {
      method: 'POST',
      body: JSON.stringify({ category, folder: folderName, appData: updated }),
    });
  } catch {
    const existingData = (await getLocalData('applications')) || {};
    const existing = existingData[key] as EnrichedApplication | undefined;
    if (!existing) return;
    existingData[key] = { ...existing, ...flags };
    await setLocalData('applications', existingData);
  }
}

export async function deleteApplication(category: CategoryKey, folderName: string): Promise<void> {
  const userId = await getUserId();
  const key = `${category}/${folderName}`;
  if (!userId) {
    const data = (await getLocalData('applications')) || {};
    delete data[key];
    await setLocalData('applications', data);
    return;
  }
  try {
    await apiFetch(`/api/db/applications?category=${encodeURIComponent(category)}&folder=${encodeURIComponent(folderName)}`, { method: 'DELETE' });
  } catch (err) {
    console.error('[storage-adapter] deleteApplication failed, falling back to localStorage:', err);
    const data = (await getLocalData('applications')) || {};
    delete data[key];
    await setLocalData('applications', data);
  }
}

// ---------------------------------------------------------------------------
// Grouping / Stats utilities (in-memory, no storage I/O)
// ---------------------------------------------------------------------------

export async function getApplicationsByStatus(applications: EnrichedApplication[]): Promise<Record<StatusKey, EnrichedApplication[]>> {
  const byStatus: Record<StatusKey, EnrichedApplication[]> = {
    prospect: [], applied: [], phone_screen: [],
    interview: [], offer: [], rejected: [],
  };
  for (const app of applications) { byStatus[app.status].push(app); }
  return byStatus;
}

export async function getCategoryStats(applications: EnrichedApplication[]): Promise<CategoryStats[]> {
  const stats: CategoryStats[] = [];
  const categoryMap = new Map<string, { name: string; color: string }>();
  for (const app of applications) {
    const key = app.category_key as CategoryKey;
    categoryMap.set(key, {
      name: (CATEGORIES as Record<string, { name: string; color: string }>)[key]?.name || app.category_name || key,
      color: (CATEGORIES as Record<string, { name: string; color: string }>)[key]?.color || app.category_color || '#888888',
    });
  }
  for (const [categoryKey, categoryInfo] of Array.from(categoryMap.entries())) {
    const categoryApps = applications.filter(a => a.category_key === categoryKey);
    const byStatus: Record<StatusKey, number> = { prospect: 0, applied: 0, phone_screen: 0, interview: 0, offer: 0, rejected: 0 };
    for (const app of categoryApps) { byStatus[app.status]++; }
    stats.push({ category: categoryKey, category_key: categoryKey as CategoryKey, category_name: categoryInfo.name, category_color: categoryInfo.color, count: categoryApps.length, by_status: byStatus });
  }
  return stats;
}

// ---------------------------------------------------------------------------
// Master Resume
// ---------------------------------------------------------------------------

export async function getMasterResume(): Promise<any> {
  const userId = await getUserId();
  if (!userId) return getLocalData('masterResume');
  try {
    return await apiFetch('/api/db/master-resume');
  } catch (err) {
    console.error('[storage-adapter] getMasterResume failed, falling back to localStorage:', err);
    return getLocalData('masterResume');
  }
}

export async function setMasterResume(data: any): Promise<void> {
  const userId = await getUserId();
  if (!userId) { await setLocalData('masterResume', data); return; }
  try {
    await apiFetch('/api/db/master-resume', { method: 'POST', body: JSON.stringify(data) });
  } catch (err) {
    console.error('[storage-adapter] setMasterResume failed, falling back to localStorage:', err);
    await setLocalData('masterResume', data);
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const settingsCache = { cloudProvider: 'none' as const, syncEnabled: false, openAiKey: '' };

export async function getSettings(): Promise<{ cloudProvider: 'none' | 'gdrive' | 'onedrive' | 'dropbox'; syncEnabled: boolean; openAiKey: string }> {
  const userId = await getUserId();
  if (!userId) return (await getLocalData('settings')) as typeof settingsCache || settingsCache;
  try {
    return await apiFetch('/api/db/settings') as typeof settingsCache;
  } catch (err) {
    console.error('[storage-adapter] getSettings failed, falling back to localStorage:', err);
    return (await getLocalData('settings')) as typeof settingsCache || settingsCache;
  }
}

export async function setSettings(data: { cloudProvider: 'none' | 'gdrive' | 'onedrive' | 'dropbox'; syncEnabled: boolean; openAiKey: string }): Promise<void> {
  const userId = await getUserId();
  if (!userId) { await setLocalData('settings', data); return; }
  try {
    await apiFetch('/api/db/settings', { method: 'POST', body: JSON.stringify(data) });
  } catch (err) {
    console.error('[storage-adapter] setSettings failed, falling back to localStorage:', err);
    await setLocalData('settings', data);
  }
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function saveDocumentHTML(category: string, folder: string, docType: string, html: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) { await setLocalData(`doc_${category}/${folder}/${docType}`, html); return; }
  try {
    await apiFetch('/api/db/documents', {
      method: 'POST',
      body: JSON.stringify({ category, folder, docType, html }),
    });
  } catch (err) {
    console.error('[storage-adapter] saveDocumentHTML failed, falling back to localStorage:', err);
    await setLocalData(`doc_${category}/${folder}/${docType}`, html);
  }
}

export async function getDocumentHTML(category: string, folder: string, docType: string): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return getLocalData(`doc_${category}/${folder}/${docType}`);
  try {
    return await apiFetch(`/api/db/documents?category=${encodeURIComponent(category)}&folder=${encodeURIComponent(folder)}&docType=${encodeURIComponent(docType)}`);
  } catch (err) {
    console.error('[storage-adapter] getDocumentHTML failed, falling back to localStorage:', err);
    return getLocalData(`doc_${category}/${folder}/${docType}`);
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function getCategoryFromFolderName(folderName: string): CategoryKey | null {
  for (const key of Object.keys(CATEGORIES)) {
    if (folderName.startsWith(key)) return key as CategoryKey;
  }
  return null;
}

export function sanitizeFilename(filename: string): string {
  const basename = filename.replace(/^.*[\\/]/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  return basename.replace(/^\.+/, '_');
}

export function allowedFile(filename: string): boolean {
  return new Set(['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg']).has(filename.split('.').pop()?.toLowerCase() || '');
}

// ---------------------------------------------------------------------------
// Backup / Restore
// ---------------------------------------------------------------------------

export interface BackupPayload {
  version: string;
  timestamp: number;
  data: Record<string, any>;
}

export async function exportAllData(): Promise<BackupPayload> {
  const userId = await getUserId();
  if (!userId) return fallbackExport();
  try {
    const data = await apiFetch('/api/db/export');
    return { version: '1.0.0', timestamp: Date.now(), data };
  } catch (err) {
    console.error('[storage-adapter] exportAllData failed, falling back to localStorage:', err);
    return fallbackExport();
  }
}

export async function importAllData(
  payload: BackupPayload,
  strategy: 'overwrite' | 'merge' = 'merge'
): Promise<{ success: boolean; itemsImported: number }> {
  const userId = await getUserId();
  if (!userId) return fallbackImport(payload, strategy);
  try {
    await apiFetch('/api/db/import', {
      method: 'POST',
      body: JSON.stringify({ data: payload.data, strategy }),
    });
    return { success: true, itemsImported: Object.keys(payload.data).length };
  } catch (err) {
    console.error('[storage-adapter] importAllData failed, falling back to localStorage:', err);
    return fallbackImport(payload, strategy);
  }
}

async function fallbackExport(): Promise<BackupPayload> {
  const storage = getExtensionStorage();
  if (storage) {
    return new Promise((resolve) => {
      storage.get(null, (allData: Record<string, unknown>) => {
        resolve({ version: '1.0.0', timestamp: Date.now(), data: allData as Record<string, any> });
      });
    });
  }
  const backupData: Record<string, any> = {};
  if (localStorage) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try { backupData[key] = JSON.parse(localStorage.getItem(key) || 'null'); }
        catch { backupData[key] = localStorage.getItem(key); }
      }
    }
  }
  return { version: '1.0.0', timestamp: Date.now(), data: backupData };
}

async function fallbackImport(payload: BackupPayload, strategy: 'overwrite' | 'merge'): Promise<{ success: boolean; itemsImported: number }> {
  if (!payload || typeof payload.data !== 'object') throw new Error('Invalid backup file structure.');
  const storage = getExtensionStorage();
  const incomingData = payload.data;
  let itemsImported = 0;
  if (storage) {
    return new Promise((resolve) => {
      if (strategy === 'overwrite') {
        storage.clear(() => { storage.set(incomingData, () => { resolve({ success: true, itemsImported: Object.keys(incomingData).length }); }); });
      } else {
        storage.get(null, (currentData: Record<string, unknown>) => { storage.set({ ...incomingData, ...currentData }, () => { resolve({ success: true, itemsImported: Object.keys(incomingData).length }); }); });
      }
    });
  }
  if (localStorage) {
    if (strategy === 'overwrite') localStorage.clear();
    for (const [key, value] of Object.entries(incomingData)) {
      if (strategy === 'overwrite' || !localStorage.getItem(key)) {
        localStorage.setItem(key, typeof value === 'string' ? value : value !== null ? JSON.stringify(value) : 'null');
        itemsImported++;
      }
    }
  }
  return { success: true, itemsImported };
}

// ---------------------------------------------------------------------------
// Cloud Sync Helpers (deprecated — kept as no-ops for compat)
// ---------------------------------------------------------------------------

export async function getCloudAccessToken(): Promise<string | null> {
  return getLocalData('cloud_access_token');
}

export async function setCloudAccessToken(token: string | null): Promise<void> {
  await setLocalData('cloud_access_token', token);
}

export async function getCloudSyncProvider(): Promise<string | null> {
  return getLocalData('cloud_sync_provider');
}

export async function setCloudSyncProvider(provider: string | null): Promise<void> {
  await setLocalData('cloud_sync_provider', provider);
}

export async function getLastSyncTime(): Promise<number | null> {
  const v = await getLocalData('cloud_last_sync_time');
  return typeof v === 'number' ? v : null;
}

export async function setLastSyncTime(ts: number | null): Promise<void> {
  await setLocalData('cloud_last_sync_time', ts);
}
