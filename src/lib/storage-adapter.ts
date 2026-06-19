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

export type CategoryKey = string;

const SYSTEM_CATEGORIES = ['Uncategorized'] as const;
export const MAX_USER_CATEGORIES = 100;

// Case-insensitive check. If any path ever creates a "uncategorized"
// row (a future migration, a different client, a race), the system
// guardrails (block edit, block delete) still apply. Without this,
// "Uncategorized" and "uncategorized" would be treated as different
// categories and the user could modify or delete a system row.
export function isSystemCategory(name: string): boolean {
  const lower = String(name).toLowerCase();
  return SYSTEM_CATEGORIES.some(c => c.toLowerCase() === lower);
}

// ---------------------------------------------------------------------------
// User Categories (Supabase-backed)
// ---------------------------------------------------------------------------

export interface UserCategory {
  id?: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
}

function transformCategoryFromApi(row: any): UserCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    color: row.color,
    createdAt: row.created_at,
  };
}

export async function getUserCategories(): Promise<UserCategory[]> {
  const userId = await getUserId();
  if (!userId) return [];

  try {
    const rows = await apiFetch('/api/db/categories');
    await cleanupOldCategoryKeys();
    return rows.map(transformCategoryFromApi);
  } catch (err) {
    console.warn('[storage-adapter] getUserCategories failed:', err);
    return [];
  }
}

// "Uncategorized" is a system category that is auto-created via a
// database trigger on user signup (migration 006). This function
// simply looks it up — no creation logic needed. Returns null if
// the row somehow doesn't exist (shouldn't happen post-migration).
export async function ensureUncategorizedCategory(): Promise<UserCategory | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const userCats = await getUserCategories();
  return userCats.find((c) => c.name.toLowerCase() === 'uncategorized') ?? null;
}

export async function saveCategory(cat: UserCategory): Promise<{ success: boolean; error?: string }> {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  if (!cat.name || !cat.name.trim()) {
    return { success: false, error: 'Category name is required' };
  }

  // "Uncategorized" is a reserved system category. The user cannot
  // create their own row with this name — the real one is auto-managed
  // by ensureUncategorizedCategory() the first time a job is saved
  // without an explicit category. Block it here (defense in depth — the
  // server also rejects) so the CategorySelector / ManageCategoriesModal
  // can show a clean, specific error message instead of a generic 409.
  if (isSystemCategory(cat.name)) {
    return { success: false, error: '"Uncategorized" is a reserved system category name. Use it for jobs that don\'t fit another category — it\'s already available in the dropdown.' };
  }

  try {
    await apiFetch('/api/db/categories', {
      method: 'POST',
      body: JSON.stringify({ name: cat.name.trim(), description: cat.description?.trim() }),
    });
    return { success: true };
  } catch (err: any) {
    if (err?.message?.includes('409') || err?.message?.includes('already exists')) {
      return { success: false, error: 'A category with this name already exists' };
    }
    if (err?.message?.includes('400') || err?.message?.includes('reserved')) {
      return { success: false, error: '"Uncategorized" is a reserved system category name.' };
    }
    if (err?.message?.includes('Maximum categories')) {
      return { success: false, error: 'Maximum categories reached' };
    }
    return { success: false, error: err.message || 'Failed to create category' };
  }
}

export async function updateCategory(oldName: string, updatedCat: Partial<UserCategory>): Promise<{ success: boolean; error?: string }> {
  if (isSystemCategory(oldName)) {
    return { success: false, error: 'Cannot modify system category' };
  }

  try {
    await apiFetch(`/api/db/categories/${encodeURIComponent(oldName)}`, {
      method: 'PUT',
      body: JSON.stringify({ name: updatedCat.name?.trim(), description: updatedCat.description?.trim() }),
    });

    const allApps = await getAllApplications();
    for (const app of allApps) {
      if (app.category_name.toLowerCase() === oldName.toLowerCase()) {
        await assignJobToCategory(app.category, app.folder, updatedCat.name || oldName);
      }
    }

    return { success: true };
  } catch (err: any) {
    if (err?.message?.includes('409') || err?.message?.includes('already exists')) {
      return { success: false, error: 'A category with this name already exists' };
    }
    return { success: false, error: err.message || 'Failed to update category' };
  }
}

export async function deleteCategory(categoryName: string): Promise<{ success: boolean; error?: string; reassignedCount?: number }> {
  if (isSystemCategory(categoryName)) {
    return { success: false, error: 'Cannot delete system category' };
  }

  const allApps = await getAllApplications();
  let reassignedCount = 0;
  for (const app of allApps) {
    if (app.category_name.toLowerCase() === categoryName.toLowerCase()) {
      await assignJobToCategory(app.category, app.folder, 'Uncategorized');
      reassignedCount++;
    }
  }

  const trashedApps = await getTrashedApplications();
  for (const app of trashedApps) {
    if (app.category_name.toLowerCase() === categoryName.toLowerCase()) {
      await assignJobToCategory(app.category, app.folder, 'Uncategorized');
      reassignedCount++;
    }
  }

  try {
    await apiFetch(`/api/db/categories/${encodeURIComponent(categoryName)}`, {
      method: 'DELETE',
    });
    return { success: true, reassignedCount };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete category', reassignedCount };
  }
}

export async function getApplicationsByCategory(categoryName: string): Promise<EnrichedApplication[]> {
  const allApps = await getAllApplications();
  return allApps.filter(app => app.category_name.toLowerCase() === categoryName.toLowerCase());
}

export async function assignJobToCategory(category: string, folder: string, newCategory: string): Promise<void> {
  const userId = await getUserId();
  const key = `${category}/${folder}`;

  const userCats = await getUserCategories();
  const newMatchedCat = userCats.find(c => c.name.toLowerCase() === newCategory.toLowerCase());
  const newCatName = newMatchedCat ? newMatchedCat.name : newCategory;
  const newCatId = newMatchedCat?.id ?? '';
  const newCatColor = newMatchedCat?.color ?? '#888888';

  if (!newCatId) {
    throw new Error(`Category not found: ${newCategory}`);
  }

  if (!userId) {
    const data = (await getLocalData('applications')) || {};
    const existing = data[key] as EnrichedApplication | undefined;
    if (existing) {
      existing.category_name = newCatName;
      existing.category_id = newCatId;
      existing.category_color = newCatColor;
      existing.category = newCatName;
      existing.category_key = newCatName;
      data[key] = existing;
      await setLocalData('applications', data);
    }
    return;
  }

  try {
    const catMap = new Map(userCats.map(c => [c.name.toLowerCase(), c]));
    const catInfo = catMap.get(String(category).toLowerCase());
    const categoryId = catInfo?.id;
    if (!categoryId) {
      throw new Error(`Category ID not found for category: ${category}`);
    }
    const row = await apiFetch(`/api/db/applications?categoryId=${encodeURIComponent(categoryId)}&folder=${encodeURIComponent(folder)}`);
    if (row && row.data) {
      const updated = {
        ...row.data,
        category_name: newCatName,
        category_id: newCatId,
        category_color: newCatColor,
        category: newCatName,
        category_key: newCatName,
      };
      await apiFetch('/api/db/applications/reassign', {
        method: 'POST',
        body: JSON.stringify({ oldCategoryId: categoryId, newCategoryId: newCatId, newCategoryName: newCatName, folder, appData: updated }),
      });
    }
  } catch (err) {
    console.error('[storage-adapter] assignJobToCategory failed:', err);
    throw err;
  }
}

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
  category_id: string;
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
  deleted_at?: string;
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

async function removeLocalData(key: string): Promise<void> {
  const storage = getExtensionStorage();
  if (storage) {
    return new Promise((resolve) => {
      storage.remove([key], () => resolve());
    });
  }
  localStorage?.removeItem(key);
}

async function cleanupOldCategoryKeys(): Promise<void> {
  await removeLocalData('jf_user_categories');
  await removeLocalData('jf_categories_migrated');
  await removeLocalData('jf_app_categories_migrated');
}

// ---------------------------------------------------------------------------
// Applications CRUD
// ---------------------------------------------------------------------------

export async function getAllApplications(): Promise<EnrichedApplication[]> {
  await cleanupExpiredTrash();

  const userCats = await getUserCategories();
  const catMap = new Map(userCats.map(c => [c.name.toLowerCase(), c]));

  const userId = await getUserId();
  if (!userId) {
    const data = await getLocalData('applications');
    if (!data) return [];
    const apps = Object.values(data) as EnrichedApplication[];
    const active = apps.filter(a => !a.deleted_at);
    for (const app of active) {
      const catKey = (app.category_key || app.category || '').toLowerCase();
      const catInfo = catMap.get(catKey);
      if (catInfo) {
        app.category_name = catInfo.name;
        app.category_color = catInfo.color;
      } else {
        app.category_name = app.category_key || app.category || 'Uncategorized';
        app.category_color = '#888888';
      }
    }
    active.sort((a, b) => new Date(b.date_applied).getTime() - new Date(a.date_applied).getTime());
    return active;
  }
  try {
    const rows = await apiFetch('/api/db/applications');
    const apps: EnrichedApplication[] = [];
    for (const row of rows) {
      const app = row.data as EnrichedApplication;
      app.category = row.category;
      app.category_id = row.category_id || '';
      app.category_key = row.category as CategoryKey;
      app.folder = row.folder;
      app.path = `${row.category}/${row.folder}`;
      const catKey = (app.category_key || '').toLowerCase();
      const catInfo = catMap.get(catKey);
      if (catInfo) {
        app.category_name = catInfo.name;
        app.category_color = catInfo.color;
        app.category_id = catInfo.id || app.category_id;
      } else {
        app.category_name = app.category_key || app.category || 'Uncategorized';
        app.category_color = '#888888';
      }
      apps.push(app);
    }
    apps.sort((a, b) => new Date(b.date_applied).getTime() - new Date(b.date_applied).getTime());
    return apps;
  } catch (err) {
    console.error('[storage-adapter] getAllApplications failed, falling back to localStorage:', err);
    const data = await getLocalData('applications');
    if (!data) return [];
    const apps = Object.values(data) as EnrichedApplication[];
    const active = apps.filter(a => !a.deleted_at);
    for (const app of active) {
      const catKey = (app.category_key || app.category || '').toLowerCase();
      const catInfo = catMap.get(catKey);
      if (catInfo) {
        app.category_name = catInfo.name;
        app.category_color = catInfo.color;
      } else {
        app.category_name = app.category_key || app.category || 'Uncategorized';
        app.category_color = '#888888';
      }
    }
    active.sort((a, b) => new Date(b.date_applied).getTime() - new Date(a.date_applied).getTime());
    return active;
  }
}

export async function getApplicationById(categoryId: string, folderName: string): Promise<EnrichedApplication | null> {
  const userId = await getUserId();
  if (!userId) {
    const key = `${categoryId}/${folderName}`;
    const data = await getLocalData('applications');
    return data?.[key] || null;
  }
  try {
    const row = await apiFetch(`/api/db/applications?categoryId=${encodeURIComponent(categoryId)}&folder=${encodeURIComponent(folderName)}`);
    if (!row) return null;
    const app = row.data as EnrichedApplication;
    app.category = row.category;
    app.category_id = row.category_id;
    app.category_key = row.category as CategoryKey;
    app.folder = row.folder;
    app.path = `${row.category}/${row.folder}`;
    return app;
  } catch (err) {
    console.error('[storage-adapter] getApplicationById failed, falling back to localStorage:', err);
    const key = `${categoryId}/${folderName}`;
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

  const userCats = userId ? await getUserCategories() : [];
  const catMap = new Map(userCats.map(c => [c.name.toLowerCase(), c]));
  const catInfo = catMap.get(String(category).toLowerCase());
  const categoryId = catInfo?.id || existingData?.category_id || '';

  const enriched: EnrichedApplication = {
    ...appData,
    category: category,
    category_id: categoryId,
    category_key: category,
    category_name: existingData?.category_name || catInfo?.name || String(category),
    category_color: existingData?.category_color || catInfo?.color || '#888888',
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
      body: JSON.stringify({ category, categoryId, folder: folderName, appData: enriched }),
    });
  } catch (err) {
    console.error('[storage-adapter] saveApplication failed, falling back to localStorage:', err);
    const data = (await getLocalData('applications')) || {};
    data[key] = enriched;
    await setLocalData('applications', data);
  }
}

/**
 * Update only the status of an application without touching other fields.
 * Unlike saveApplication, this does NOT reset response_date or any other data.
 */
export async function updateApplicationStatus(
  category: CategoryKey,
  folderName: string,
  status: StatusKey
): Promise<void> {
  const userId = await getUserId();
  const key = `${category}/${folderName}`;

  if (!userId) {
    const data = (await getLocalData('applications')) || {};
    const existing = data[key] as EnrichedApplication | undefined;
    if (!existing) return;
    const now = new Date();
    const appliedDate = new Date(existing.date_applied);
    const daysSinceApplied = Math.floor((now.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
    data[key] = {
      ...existing,
      status,
      days_since_applied: daysSinceApplied,
      needs_followup: ['prospect', 'applied'].includes(status) && daysSinceApplied > 7,
    };
    await setLocalData('applications', data);
    return;
  }

  try {
    await apiFetch('/api/db/applications', {
      method: 'POST',
      body: JSON.stringify({ category, folder: folderName, updates: { status } }),
    });
  } catch (err) {
    console.error('[storage-adapter] updateApplicationStatus failed:', err);
    // Fallback: do a full save but preserve response_date
    const existing = await getApplicationById(category, folderName);
    if (existing) {
      await saveApplication(category, folderName, { ...existing, status } as Application);
    }
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
    const userCats = await getUserCategories();
    const catMap = new Map(userCats.map(c => [c.name.toLowerCase(), c]));
    const catInfo = catMap.get(String(category).toLowerCase());
    const categoryId = catInfo?.id;
    if (!categoryId) {
      throw new Error(`Category ID not found for category: ${category}`);
    }
    const row = await apiFetch(`/api/db/applications?categoryId=${encodeURIComponent(categoryId)}&folder=${encodeURIComponent(folderName)}`);
    if (!row) return;
    const existingRow = row.data as EnrichedApplication;
    const updated = { ...existingRow, ...flags };
    await apiFetch('/api/db/applications', {
      method: 'POST',
      body: JSON.stringify({ category, categoryId, folder: folderName, appData: updated }),
    });
  } catch (err) {
    console.error('[storage-adapter] updateApplicationDocFlags failed:', err);
    const existingData = (await getLocalData('applications')) || {};
    const existing = existingData[key] as EnrichedApplication | undefined;
    if (!existing) return;
    existingData[key] = { ...existing, ...flags };
    await setLocalData('applications', existingData);
  }
}

// Soft-delete: moves to trash (30-day retention)
export async function deleteApplication(category: CategoryKey, folderName: string): Promise<void> {
  await trashApplication(category, folderName);
}

export async function trashApplication(category: CategoryKey, folderName: string): Promise<void> {
  const userId = await getUserId();
  const key = `${category}/${folderName}`;
  if (!userId) {
    const data = (await getLocalData('applications')) || {};
    if (data[key]) {
      data[key].deleted_at = new Date().toISOString();
      await setLocalData('applications', data);
    }
    return;
  }
  try {
    const userCats = await getUserCategories();
    const catMap = new Map(userCats.map(c => [c.name.toLowerCase(), c]));
    const catInfo = catMap.get(String(category).toLowerCase());
    const categoryId = catInfo?.id;

    const payload: Record<string, string> = { folder: folderName };
    if (categoryId) {
      payload.categoryId = categoryId;
    } else {
      payload.category = category;
    }

    await apiFetch(`/api/db/applications/trash`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[storage-adapter] trashApplication failed:', err);
    throw err;
  }
}

export async function getTrashedApplications(): Promise<EnrichedApplication[]> {
  const userId = await getUserId();
  if (!userId) {
    const data = (await getLocalData('applications')) || {};
    const apps = Object.values(data) as EnrichedApplication[];
    const trashed = apps.filter(a => a.deleted_at && a.deleted_at !== null);
    return trashed.sort((a, b) => new Date(b.deleted_at!).getTime() - new Date(a.deleted_at!).getTime());
  }
  try {
    const userCats = await getUserCategories();
    const catMap = new Map(userCats.map(c => [c.name.toLowerCase(), c]));
    const rows = await apiFetch('/api/db/applications/trash');
    const apps: EnrichedApplication[] = [];
    for (const row of rows) {
      const app = row.data as EnrichedApplication;
      app.category = row.category;
      app.category_id = row.category_id || '';
      app.category_key = row.category as CategoryKey;
      app.folder = row.folder;
      app.path = `${row.category}/${row.folder}`;
      app.deleted_at = row.deleted_at;
      const catKey = (app.category_key || '').toLowerCase();
      const catInfo = catMap.get(catKey);
      app.category_name = catInfo?.name || app.category_key || 'Uncategorized';
      app.category_color = catInfo?.color || '#888888';
      if (catInfo) {
        app.category_id = catInfo.id || app.category_id;
      }
      apps.push(app);
    }
    return apps.sort((a, b) => new Date(b.deleted_at!).getTime() - new Date(b.deleted_at!).getTime());
  } catch (err) {
    console.error('[storage-adapter] getTrashedApplications failed, falling back to localStorage:', err);
    const data = (await getLocalData('applications')) || {};
    const apps = Object.values(data) as EnrichedApplication[];
    return apps.filter(a => a.deleted_at && a.deleted_at !== null)
      .sort((a, b) => new Date(b.deleted_at!).getTime() - new Date(a.deleted_at!).getTime());
  }
}

export async function restoreApplication(category: CategoryKey, folderName: string): Promise<void> {
  const userId = await getUserId();
  const key = `${category}/${folderName}`;
  if (!userId) {
    const data = (await getLocalData('applications')) || {};
    if (data[key]) {
      delete data[key].deleted_at;
      await setLocalData('applications', data);
    }
    return;
  }
  try {
    const userCats = await getUserCategories();
    const catMap = new Map(userCats.map(c => [c.name.toLowerCase(), c]));
    const catInfo = catMap.get(String(category).toLowerCase());
    const categoryId = catInfo?.id;

    const payload: Record<string, string> = { folder: folderName };
    if (categoryId) {
      payload.categoryId = categoryId;
    } else {
      payload.category = category;
    }

    await apiFetch(`/api/db/applications/restore`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[storage-adapter] restoreApplication failed:', err);
    throw err;
  }
}

export async function permanentlyDeleteApplication(category: CategoryKey, folderName: string): Promise<void> {
  const userId = await getUserId();
  const key = `${category}/${folderName}`;
  if (!userId) {
    const data = (await getLocalData('applications')) || {};
    delete data[key];
    await setLocalData('applications', data);
    const docTypes = ['job_description', 'resume', 'cover_letter'];
    for (const docType of docTypes) {
      const docKey = `doc_${category}/${folderName}/${docType}`;
      const docData = await getLocalData(docKey);
      if (docData) {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(docKey);
      }
    }
    return;
  }
  try {
    const userCats = await getUserCategories();
    const catMap = new Map(userCats.map(c => [c.name.toLowerCase(), c]));
    const catInfo = catMap.get(String(category).toLowerCase());
    const categoryId = catInfo?.id;

    const payload: Record<string, string> = { folder: folderName };
    if (categoryId) {
      payload.categoryId = categoryId;
    } else {
      payload.category = category;
    }

    await apiFetch(`/api/db/applications/permanent`, {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[storage-adapter] permanentlyDeleteApplication failed:', err);
    throw err;
  }
}

async function cleanupExpiredTrash(): Promise<void> {
  const userId = await getUserId();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  if (!userId) {
    const data = (await getLocalData('applications')) || {};
    const toDelete: string[] = [];
    for (const [key, app] of Object.entries(data)) {
      const a = app as EnrichedApplication;
      if (a.deleted_at && a.deleted_at < thirtyDaysAgo) {
        toDelete.push(key);
      }
    }
    for (const key of toDelete) {
      delete data[key];
      // Delete documents
      const docTypes = ['job_description', 'resume', 'cover_letter'];
      for (const docType of docTypes) {
        const docKey = `doc_${key}/${docType}`;
        if (typeof localStorage !== 'undefined') localStorage.removeItem(docKey);
      }
    }
    await setLocalData('applications', data);
    return;
  }

  // For Supabase, pg_cron handles this automatically
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

  // Build a map of user categories for quick lookup
  const userCats = await getUserCategories();
  const userCatMap = new Map(userCats.map(c => [c.name.toLowerCase(), c]));

  // Always add Uncategorized as a system category
  categoryMap.set('Uncategorized', { name: 'Uncategorized', color: '#888888' });

  for (const app of applications) {
    const key = app.category_key as CategoryKey;
    const appCatName = app.category_name || key;

    if (appCatName.toLowerCase() === 'uncategorized') {
      categoryMap.set('Uncategorized', { name: 'Uncategorized', color: '#888888' });
    } else if (!categoryMap.has(appCatName)) {
      // Check if it's a user category
      const userCat = userCatMap.get(appCatName.toLowerCase());
      if (userCat) {
        categoryMap.set(appCatName, { name: userCat.name, color: userCat.color });
      } else {
        // Fallback for any category not in user list
        categoryMap.set(appCatName, {
          name: app.category_name || key,
          color: app.category_color || '#888888',
        });
      }
    }
  }

  for (const [categoryKey, categoryInfo] of Array.from(categoryMap.entries())) {
    const categoryApps = applications.filter(a => a.category_key === categoryKey || a.category_name === categoryKey || a.category_name?.toLowerCase() === categoryKey.toLowerCase());
    const byStatus: Record<StatusKey, number> = { prospect: 0, applied: 0, phone_screen: 0, interview: 0, offer: 0, rejected: 0 };
    for (const app of categoryApps) { byStatus[app.status]++; }
    stats.push({ category: categoryKey, category_key: categoryKey as CategoryKey, category_name: categoryInfo.name, category_color: categoryInfo.color, count: categoryApps.length, by_status: byStatus });
  }

  stats.sort((a, b) => {
    if (a.category_key === 'Uncategorized') return 1;
    if (b.category_key === 'Uncategorized') return -1;
    return 0;
  });

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
    const userCats = await getUserCategories();
    const catMap = new Map(userCats.map(c => [c.name.toLowerCase(), c]));
    const catInfo = catMap.get(String(category).toLowerCase());
    const categoryId = catInfo?.id;
    if (!categoryId) {
      throw new Error(`Category ID not found for category: ${category}`);
    }
    await apiFetch('/api/db/documents', {
      method: 'POST',
      body: JSON.stringify({ category, categoryId, folder, docType, html }),
    });
  } catch (err) {
    console.error('[storage-adapter] saveDocumentHTML failed:', err);
    throw err;
  }
}

export async function getDocumentHTML(category: string, folder: string, docType: string): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return getLocalData(`doc_${category}/${folder}/${docType}`);
  try {
    const userCats = await getUserCategories();
    const catMap = new Map(userCats.map(c => [c.name.toLowerCase(), c]));
    const catInfo = catMap.get(String(category).toLowerCase());
    const categoryId = catInfo?.id || '';
    return await apiFetch(`/api/db/documents?categoryId=${encodeURIComponent(categoryId)}&folder=${encodeURIComponent(folder)}&docType=${encodeURIComponent(docType)}`);
  } catch (err) {
    console.error('[storage-adapter] getDocumentHTML failed, falling back to localStorage:', err);
    return getLocalData(`doc_${category}/${folder}/${docType}`);
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

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
