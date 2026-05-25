// Unified native storage helper - no dynamic imports needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StorageArea = any;

const getExtensionStorage = (): StorageArea | null => {
  if (typeof window === 'undefined') return null;

  // Chrome
  if (window.chrome && window.chrome.storage) {
    return window.chrome.storage.local;
  }
  // Firefox - browser is a global in extension context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.browser && w.browser.storage) {
    return w.browser.storage.local;
  }
  return null;
};

export async function getLocalData(key: string): Promise<any> {
  const storage = getExtensionStorage();
  if (storage) {
    return new Promise((resolve) => {
      storage.get([key], (result: Record<string, unknown>) => {
        resolve(result[key] || null);
      });
    });
  } else {
    if (typeof localStorage !== 'undefined') {
      const local = localStorage.getItem(key);
      return local ? JSON.parse(local) : null;
    }
    return null;
  }
}

export async function setLocalData(key: string, value: any): Promise<void> {
  const storage = getExtensionStorage();
  if (storage) {
    return new Promise((resolve) => {
      storage.set({ [key]: value }, () => {
        resolve();
      });
    });
  } else {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
}

export const CATEGORIES = {
  '1_tech_support': { name: 'Tech Support', color: '#0d6efd', priority: 1 },
  '2_general_basic': { name: 'General', color: '#198754', priority: 2 },
  '3_kitchen_cook': { name: 'Kitchen', color: '#fd7e14', priority: 3 },
} as const;

export const STATUS_CONFIG = {
  prospect: { label: 'Prospect', color: '#888888' },
  applied: { label: 'Applied', color: '#4a90e2' },
  phone_screen: { label: 'Phone Screen', color: '#5ac8fa' },
  interview: { label: 'Interview', color: '#f5a623' },
  offer: { label: 'Offer', color: '#4caf50' },
  rejected: { label: 'Rejected', color: '#e74c3c' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
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

let settingsCache: { cloudProvider: 'none' | 'gdrive' | 'onedrive' | 'dropbox'; syncEnabled: boolean; openAiKey: string } = {
  cloudProvider: 'none',
  syncEnabled: false,
  openAiKey: ''
};

export async function getAllApplications(): Promise<EnrichedApplication[]> {
  const data = await getLocalData('applications');
  if (!data) return [];
  const apps = Object.values(data) as EnrichedApplication[];
  apps.sort((a, b) => new Date(b.date_applied).getTime() - new Date(a.date_applied).getTime());
  return apps;
}

export async function getApplicationById(category: CategoryKey, folderName: string): Promise<EnrichedApplication | null> {
  const key = `${category}/${folderName}`;
  const data = await getLocalData('applications');
  return data?.[key] || null;
}

export async function saveApplication(
  category: CategoryKey,
  folderName: string,
  appData: Application
): Promise<void> {
  const key = `${category}/${folderName}`;
  const existingData = (await getLocalData('applications')) || {};
  const categoryInfo = CATEGORIES[category];
  const now = new Date();
  const appliedDate = new Date(appData.date_applied);
  const daysSinceApplied = Math.floor((now.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));

  const enriched: EnrichedApplication = {
    ...appData,
    category: category,
    category_key: category,
    category_name: categoryInfo.name,
    category_color: categoryInfo.color,
    folder: folderName,
    path: key,
    has_job_description: true,
    has_resume: true,
    has_cover_letter: true,
    days_since_applied: daysSinceApplied,
    needs_followup: ['prospect', 'applied'].includes(appData.status) && daysSinceApplied > 7,
    files: [],
  };

  existingData[key] = enriched;
  await setLocalData('applications', existingData);
}

export async function deleteApplication(category: CategoryKey, folderName: string): Promise<void> {
  const key = `${category}/${folderName}`;
  const existingData = (await getLocalData('applications')) || {};
  delete existingData[key];
  await setLocalData('applications', existingData);
}

export async function getApplicationsByStatus(applications: EnrichedApplication[]): Promise<Record<StatusKey, EnrichedApplication[]>> {
  const byStatus: Record<StatusKey, EnrichedApplication[]> = {
    prospect: [],
    applied: [],
    phone_screen: [],
    interview: [],
    offer: [],
    rejected: [],
  };

  for (const app of applications) {
    byStatus[app.status].push(app);
  }

  return byStatus;
}

export async function getCategoryStats(applications: EnrichedApplication[]): Promise<CategoryStats[]> {
  const stats: CategoryStats[] = [];

  for (const [categoryKey, categoryInfo] of Object.entries(CATEGORIES)) {
    const categoryApps = applications.filter((a) => a.category_key === categoryKey);

    const byStatus: Record<StatusKey, number> = {
      prospect: 0,
      applied: 0,
      phone_screen: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };

    for (const app of categoryApps) {
      byStatus[app.status]++;
    }

    stats.push({
      category: categoryKey,
      category_key: categoryKey as CategoryKey,
      category_name: categoryInfo.name,
      category_color: categoryInfo.color,
      count: categoryApps.length,
      by_status: byStatus,
    });
  }

  return stats;
}

export async function getMasterResume(): Promise<any> {
  return await getLocalData('masterResume');
}

export async function setMasterResume(data: any): Promise<void> {
  await setLocalData('masterResume', data);
}

export async function getSettings(): Promise<{ cloudProvider: 'none' | 'gdrive' | 'onedrive' | 'dropbox'; syncEnabled: boolean; openAiKey: string }> {
  return await getLocalData('settings') || settingsCache;
}

export async function setSettings(data: { cloudProvider: 'none' | 'gdrive' | 'onedrive' | 'dropbox'; syncEnabled: boolean; openAiKey: string }): Promise<void> {
  await setLocalData('settings', data);
}

export function getCategoryFromFolderName(folderName: string): CategoryKey | null {
  for (const key of Object.keys(CATEGORIES)) {
    if (folderName.startsWith(key)) {
      return key as CategoryKey;
    }
  }
  return null;
}

export async function saveDocumentHTML(category: string, folder: string, docType: string, html: string): Promise<void> {
  const key = `doc_${category}/${folder}/${docType}`;
  await setLocalData(key, html);
}

export async function getDocumentHTML(category: string, folder: string, docType: string): Promise<string | null> {
  const key = `doc_${category}/${folder}/${docType}`;
  return await getLocalData(key);
}

export function sanitizeFilename(filename: string): string {
  const basename = filename.replace(/^.*[\\/]/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  return basename.replace(/^\.+/, '_');
}

export function allowedFile(filename: string): boolean {
  const allowedExtensions = new Set(['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg']);
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return allowedExtensions.has(ext);
}

// ---------------------------------------------------------------------------
// Data Portability - Backup & Restore
// ---------------------------------------------------------------------------

export interface BackupPayload {
  version: string;
  timestamp: number;
  data: Record<string, any>;
}

export async function exportAllData(): Promise<BackupPayload> {
  const storage = (typeof window !== 'undefined' && window.chrome && window.chrome.storage)
    ? window.chrome.storage.local
    : null;

  if (storage) {
    return new Promise((resolve) => {
      storage.get(null, (allData: Record<string, unknown>) => {
        resolve({
          version: '1.0.0',
          timestamp: Date.now(),
          data: allData as Record<string, any>
        });
      });
    });
  } else {
    const backupData: Record<string, any> = {};
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            backupData[key] = JSON.parse(localStorage.getItem(key) || 'null');
          } catch {
            backupData[key] = localStorage.getItem(key);
          }
        }
      }
    }
    return {
      version: '1.0.0',
      timestamp: Date.now(),
      data: backupData
    };
  }
}

export async function importAllData(
  payload: BackupPayload,
  strategy: 'overwrite' | 'merge' = 'merge'
): Promise<{ success: boolean; itemsImported: number }> {
  if (!payload || typeof payload.data !== 'object') {
    throw new Error('Invalid backup file structure.');
  }

  const storage = (typeof window !== 'undefined' && window.chrome && window.chrome.storage)
    ? window.chrome.storage.local
    : null;

  const incomingData = payload.data;
  let itemsImported = 0;

  if (storage) {
    return new Promise((resolve) => {
      if (strategy === 'overwrite') {
        storage.clear(() => {
          storage.set(incomingData, () => {
            itemsImported = Object.keys(incomingData).length;
            resolve({ success: true, itemsImported });
          });
        });
      } else {
        storage.get(null, (currentData: Record<string, unknown>) => {
          const finalData = { ...incomingData, ...currentData };
          storage.set(finalData, () => {
            itemsImported = Object.keys(incomingData).length;
            resolve({ success: true, itemsImported });
          });
        });
      }
    });
  } else {
    if (typeof localStorage !== 'undefined') {
      if (strategy === 'overwrite') {
        localStorage.clear();
      }
      for (const [key, value] of Object.entries(incomingData)) {
        if (strategy === 'overwrite' || !localStorage.getItem(key)) {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          itemsImported++;
        }
      }
    }
    return { success: true, itemsImported };
  }
}