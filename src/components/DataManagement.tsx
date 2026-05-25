'use client';

import { useEffect, useState, useRef } from 'react';
import {
  exportAllData,
  importAllData,
  getCloudAccessToken,
  getCloudSyncProvider,
  getLastSyncTime,
  setCloudSyncProvider,
  setCloudAccessToken,
  setLastSyncTime,
  type BackupPayload,
} from '@/lib/storage-adapter';
import { syncToCloud, type CloudProvider } from '@/lib/cloud-sync';
import Button from '@/components/design/Button';
import Card from '@/components/design/Card';
import SunsetStripeBand from '@/components/design/sunset-stripe-band';

type DataMgmtState = 'idle' | 'exporting' | 'importing' | 'success' | 'error';
type CloudStatus = 'disconnected' | 'connected' | 'syncing';

const PROVIDERS: { value: CloudProvider | 'none'; label: string }[] = [
  { value: 'none', label: 'None (Local Only)' },
  { value: 'google', label: 'Google Drive (App Space)' },
  { value: 'onedrive', label: 'Microsoft OneDrive' },
  { value: 'dropbox', label: 'Dropbox' },
];

export default function DataManagement() {
  const [state, setState] = useState<DataMgmtState>('idle');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [importStrategy, setImportStrategy] = useState<'merge' | 'overwrite'>('merge');
  const [pendingPayload, setPendingPayload] = useState<BackupPayload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloud sync state
  const [cloudProvider, setCloudProvider] = useState<CloudProvider | 'none'>('none');
  const [cloudToken, setCloudToken] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Load cloud config on mount
  useEffect(() => {
    async function loadCloudState() {
      const provider = await getCloudSyncProvider();
      const token = await getCloudAccessToken();
      const lastSync = await getLastSyncTime();
      setCloudProvider((provider as CloudProvider | 'none') || 'none');
      setCloudToken(token);
      setLastSyncTime(lastSync);
      setCloudStatus(token ? 'connected' : 'disconnected');
    }
    loadCloudState();
  }, []);

  // Listen for background sync completion
  useEffect(() => {
    const listener = (message: { action: string; success?: boolean; error?: string }) => {
      if (message.action === 'CLOUD_BACKGROUND_SYNC') {
        // Background sync tick — refresh last sync time
        getLastSyncTime().then(setLastSyncTime);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleExport = async () => {
    setState('exporting');
    setResultMessage(null);

    try {
      const backup = await exportAllData();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job_foocus_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setState('success');
      setResultMessage(`Backup exported — ${Object.keys(backup.data).length} items saved.`);
    } catch (error) {
      setState('error');
      setResultMessage(error instanceof Error ? error.message : 'Export failed.');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState('importing');
    setResultMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const payload: BackupPayload = JSON.parse(text);
        if (!payload || typeof payload.data !== 'object' || !payload.version) {
          throw new Error('Invalid backup file: missing version or data fields.');
        }
        setPendingPayload(payload);
        setState('idle');
      } catch {
        setState('error');
        setResultMessage('Failed to read file — invalid JSON structure.');
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportConfirm = async () => {
    if (!pendingPayload) return;
    setState('importing');
    setResultMessage(null);
    try {
      const result = await importAllData(pendingPayload, importStrategy);
      setState('success');
      setResultMessage(
        importStrategy === 'overwrite'
          ? `Database overwritten — ${result.itemsImported} items restored.`
          : `Merged — ${result.itemsImported} items imported, existing data preserved.`
      );
      setPendingPayload(null);
    } catch (error) {
      setState('error');
      setResultMessage(error instanceof Error ? error.message : 'Import failed.');
    }
  };

  const handleImportCancel = () => {
    setPendingPayload(null);
    setState('idle');
    setResultMessage(null);
  };

  // --- Cloud Sync Handlers ---

  const handleProviderChange = async (newProvider: CloudProvider | 'none') => {
    if (newProvider === 'none') {
      // Disconnect
      if (cloudToken) {
        await chrome.runtime.sendMessage({ action: 'CLOUD_DISCONNECT' });
      }
      setCloudProvider('none');
      setCloudToken(null);
      setCloudStatus('disconnected');
      setLastSyncTime(null);
      setCloudSyncProvider(null);
      setCloudAccessToken(null);
    } else {
      // Initiate OAuth flow
      setState('exporting');
      setResultMessage(null);
      try {
        const result = await chrome.runtime.sendMessage({
          action: 'CLOUD_AUTH',
          provider: newProvider,
        });
        if (result.success && result.token) {
          setCloudProvider(newProvider);
          setCloudToken(result.token);
          setCloudStatus('connected');
          await setCloudSyncProvider(newProvider);
          await setCloudAccessToken(result.token);
          setState('idle');
          setResultMessage(`Connected to ${PROVIDERS.find(p => p.value === newProvider)?.label}.`);
        } else {
          throw new Error(result.error || 'Authorization failed.');
        }
      } catch (error) {
        setState('error');
        setResultMessage(error instanceof Error ? error.message : 'Authorization failed.');
      }
    }
  };

  const handleSyncNow = async () => {
    if (!cloudToken || cloudProvider === 'none') return;

    setSyncing(true);
    setResultMessage(null);

    try {
      const result = await syncToCloud(cloudProvider, cloudToken);
      await setLastSyncTime(result.timestamp);
      setLastSyncTime(result.timestamp);
      const dirLabel = result.direction === 'push' ? 'pushed' : result.direction === 'pull' ? 'pulled' : 'already in sync';
      setResultMessage(`Sync complete — ${dirLabel} at ${new Date(result.timestamp).toLocaleString()}.`);
      setState('success');
    } catch (error) {
      setState('error');
      setResultMessage(error instanceof Error ? error.message : 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString();
  };

  const currentProviderLabel = PROVIDERS.find(p => p.value === cloudProvider)?.label || 'None';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[12px] font-bold uppercase tracking-[0.05em] text-steel mb-1">Data Management</h2>
        <p className="text-xs text-steel">Backup, restore, and sync your job application data.</p>
      </div>

      {/* Cloud Sync Section */}
      <Card variant="cream">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink mb-1">Cloud Sync</h3>
              <p className="text-xs text-steel">
                {cloudStatus === 'connected'
                  ? `Connected to ${currentProviderLabel}`
                  : cloudStatus === 'syncing'
                  ? 'Syncing...'
                  : 'Not connected'}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                cloudStatus === 'connected'
                  ? 'bg-green-100 text-green-700'
                  : cloudStatus === 'syncing'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {cloudStatus === 'connected' ? 'Connected' : cloudStatus === 'syncing' ? 'Syncing...' : 'Disconnected'}
            </span>
          </div>

          {/* Provider selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink">Provider</label>
            <select
              value={cloudProvider}
              onChange={(e) => handleProviderChange(e.target.value as CloudProvider | 'none')}
              className="w-full px-3 py-2 text-sm border border-hairline-strong rounded-md bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={cloudStatus === 'syncing'}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Last sync */}
          <p className="text-xs text-steel">
            Last sync: <span className="font-mono">{formatLastSync(lastSyncTime)}</span>
          </p>

          {/* Sync Now button */}
          <Button
            variant="primary"
            onClick={handleSyncNow}
            disabled={cloudStatus !== 'connected' || syncing}
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </Card>

      {/* Export Section */}
      <Card variant="cream">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-ink mb-1">Export Backup</h3>
            <p className="text-xs text-steel">Download a complete JSON snapshot of all your data.</p>
          </div>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={state === 'exporting'}
          >
            {state === 'exporting' ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </Card>

      {/* Import Section */}
      <Card variant="cream-soft">
        <h3 className="text-sm font-semibold text-ink mb-1">Import Backup</h3>
        <p className="text-xs text-steel mb-4">Restore from a previously exported JSON file.</p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />

        {pendingPayload ? (
          <div className="space-y-3">
            <p className="text-sm text-ink">
              Ready to import <strong>{Object.keys(pendingPayload.data).length}</strong> items.
            </p>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-ink">Import strategy</label>
              <select
                value={importStrategy}
                onChange={(e) => setImportStrategy(e.target.value as 'merge' | 'overwrite')}
                className="w-full px-3 py-2 text-sm border border-hairline-strong rounded-md bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="merge">Safe Merge — skip existing items</option>
                <option value="overwrite">Overwrite — clear and replace all</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleImportConfirm} disabled={state === 'importing'}>
                {state === 'importing' ? 'Importing...' : 'Confirm Import'}
              </Button>
              <Button variant="secondary" onClick={handleImportCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={state === 'importing'}
          >
            {state === 'importing' ? 'Reading file...' : 'Select JSON File'}
          </Button>
        )}
      </Card>

      {/* Result Messages */}
      {resultMessage && (
        <div
          className={`text-sm px-4 py-3 rounded-md ${
            state === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          {resultMessage}
        </div>
      )}

      <SunsetStripeBand />
    </div>
  );
}