// Cloud Sync Engine — multi-provider OAuth + backup synchronization
// Runs in the Next.js page context; background.js triggers alarms that
// route through to this logic via chrome.runtime.sendMessage.

import { exportAllData, importAllData, type BackupPayload } from '@/lib/storage-adapter';

// ---------------------------------------------------------------------------
// Provider Configurations
// ---------------------------------------------------------------------------

export type CloudProvider = 'google' | 'onedrive' | 'dropbox';

export interface CloudProviderConfig {
  name: CloudProvider;
  clientId: string;
  authUrl: string;
  scope: string;
  // REST API base
  apiBase: string;
  // Filename stored in the provider's app folder
  fileName: string;
}

const BACKUP_FILENAME = 'job_foocus_backup.json';

function getProviderConfig(provider: CloudProvider): CloudProviderConfig {
  switch (provider) {
    case 'google':
      return {
        name: 'google',
        clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com', // Replace with real client ID
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        scope: 'https://www.googleapis.com/auth/drive.appdata',
        apiBase: 'https://www.googleapis.com/drive/v3',
        fileName: BACKUP_FILENAME,
      };
    case 'onedrive':
      return {
        name: 'onedrive',
        clientId: 'YOUR_ONEDRIVE_CLIENT_ID', // Replace with real client ID
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        scope: 'https://graph.microsoft.com/files.readwrite.appfolder',
        apiBase: 'https://graph.microsoft.com/v1.0/me/drive/special/approot',
        fileName: BACKUP_FILENAME,
      };
    case 'dropbox':
      return {
        name: 'dropbox',
        clientId: 'YOUR_DROPBOX_CLIENT_ID', // Replace with real client ID
        authUrl: 'https://www.dropbox.com/oauth2/authorize',
        scope: '',
        apiBase: 'https://api.dropboxapi.com/2',
        fileName: BACKUP_FILENAME,
      };
  }
}

// ---------------------------------------------------------------------------
// OAuth Authentication via chrome.identity.launchWebAuthFlow
// ---------------------------------------------------------------------------

export async function authenticateProvider(provider: CloudProvider): Promise<string> {
  const config = getProviderConfig(provider);

  const redirectUrl = chrome.identity.getRedirectURL();

  const scopeParam = provider === 'dropbox'
    ? ''
    : `&scope=${encodeURIComponent(config.scope)}`;

  const fullAuthUrl =
    `${config.authUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=token${scopeParam}`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: fullAuthUrl, interactive: true },
      (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          return reject(chrome.runtime.lastError?.message || 'Authorization failed.');
        }
        const urlParts = new URL(responseUrl);
        const fragment = urlParts.hash.substring(1);
        const params = new URLSearchParams(fragment);
        const token = params.get('access_token');
        if (token) {
          resolve(token);
        } else {
          reject('Access token not found in redirect URL.');
        }
      }
    );
  });
}

// ---------------------------------------------------------------------------
// REST Helpers
// ---------------------------------------------------------------------------

async function gdriveUpload(token: string, payload: BackupPayload): Promise<void> {
  const metadata = {
    name: BACKUP_FILENAME,
    parents: ['appDataFolder'],
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append(
    'file',
    new Blob([JSON.stringify(payload)], { type: 'application/json' })
  );

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google Drive upload failed: ${err.error?.message || res.status}`);
  }
}

async function gdriveDownload(token: string): Promise<BackupPayload | null> {
  // List files in appDataFolder
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name+="${BACKUP_FILENAME}"&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!listRes.ok) return null;

  const listData = await listRes.json();
  const file = listData.files?.[0];
  if (!file) return null;

  const fileRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!fileRes.ok) return null;

  return fileRes.json();
}

async function gdriveDeleteFile(token: string): Promise<void> {
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name+="${BACKUP_FILENAME}"&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!listRes.ok) return;

  const listData = await listRes.json();
  const file = listData.files?.[0];
  if (!file) return;

  await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );
}

async function onedriveUpload(token: string, payload: BackupPayload): Promise<void> {
  // First try to delete existing file
  const listRes = await fetch(
    'https://graph.microsoft.com/v1.0/me/drive/special/approot/children',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (listRes.ok) {
    const items = await listRes.json();
    const existing = items.value?.find((f: any) => f.name === BACKUP_FILENAME);
    if (existing) {
      await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/special/approot/items/${existing.id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
    }
  }

  const uploadRes = await fetch(
    'https://graph.microsoft.com/v1.0/me/drive/special/approot:/' + BACKUP_FILENAME + ':/content',
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(`OneDrive upload failed: ${err.error?.message || uploadRes.status}`);
  }
}

async function onedriveDownload(token: string): Promise<BackupPayload | null> {
  const res = await fetch(
    'https://graph.microsoft.com/v1.0/me/drive/special/approot/children?$filter=name eq "' + BACKUP_FILENAME + '"',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const file = data.value?.[0];
  if (!file) return null;

  const fileRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/special/approot/items/${file.id}/content`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!fileRes.ok) return null;

  return fileRes.json();
}

async function dropboxUpload(token: string, payload: BackupPayload): Promise<void> {
  const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({
        path: '/' + BACKUP_FILENAME,
        mode: 'overwrite',
        autorename: false,
        mute: true,
      }),
      'Content-Type': 'application/octet-stream',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Dropbox upload failed: ${err.error_summary || res.status}`);
  }
}

async function dropboxDownload(token: string): Promise<BackupPayload | null> {
  const listRes = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: '' }),
  });

  if (!listRes.ok) return null;

  const listData = await listRes.json();
  const file = listData.entries?.find((f: any) => f.name === BACKUP_FILENAME);
  if (!file) return null;

  const fileRes = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path: '/' + BACKUP_FILENAME }),
    },
  });

  if (!fileRes.ok) return null;

  return fileRes.json();
}

// ---------------------------------------------------------------------------
// Public Sync API
// ---------------------------------------------------------------------------

export async function uploadToProvider(
  provider: CloudProvider,
  token: string,
  payload: BackupPayload
): Promise<void> {
  switch (provider) {
    case 'google':
      await gdriveUpload(token, payload);
      break;
    case 'onedrive':
      await onedriveUpload(token, payload);
      break;
    case 'dropbox':
      await dropboxUpload(token, payload);
      break;
  }
}

export async function downloadFromProvider(
  provider: CloudProvider,
  token: string
): Promise<BackupPayload | null> {
  switch (provider) {
    case 'google':
      return gdriveDownload(token);
    case 'onedrive':
      return onedriveDownload(token);
    case 'dropbox':
      return dropboxDownload(token);
  }
}

/**
 * Full bidirectional sync:
 * - Export local data
 * - Check remote state file
 * - Resolve by timestamp: newer data wins
 * - Upload or overwrite local accordingly
 */
export async function syncToCloud(
  provider: CloudProvider,
  token: string
): Promise<{ direction: 'push' | 'pull' | 'none'; timestamp: number }> {
  const localBackup = await exportAllData();

  try {
    const remoteBackup = await downloadFromProvider(provider, token);

    if (!remoteBackup) {
      // No remote file — push local
      await uploadToProvider(provider, token, localBackup);
      return { direction: 'push', timestamp: localBackup.timestamp };
    }

    if (remoteBackup.timestamp > localBackup.timestamp) {
      // Remote is newer — pull and overwrite local
      await importAllData(remoteBackup, 'overwrite');
      return { direction: 'pull', timestamp: remoteBackup.timestamp };
    } else if (localBackup.timestamp > remoteBackup.timestamp) {
      // Local is newer — push
      await uploadToProvider(provider, token, localBackup);
      return { direction: 'push', timestamp: localBackup.timestamp };
    }

    return { direction: 'none', timestamp: localBackup.timestamp };
  } catch (err) {
    console.error('Sync error:', err);
    // On error, try to push local as a safeguard
    await uploadToProvider(provider, token, localBackup);
    return { direction: 'push', timestamp: localBackup.timestamp };
  }
}