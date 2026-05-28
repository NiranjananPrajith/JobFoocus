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
import { syncToCloud, authenticateProvider, type CloudProvider } from '@/lib/cloud-sync';
import Button from '@/components/design/Button';
import Card from '@/components/design/Card';

type DataMgmtState = 'idle' | 'exporting' | 'importing' | 'success' | 'error';
type CloudStatus = 'disconnected' | 'connected' | 'syncing';

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

  // Listen for background sync completion (extension context only)
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;
    const listener = (message: { action: string }) => {
      if (message.action === 'CLOUD_BACKGROUND_SYNC') {
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

  const handleProviderChange = async (newProvider: CloudProvider | 'none') => {
    if (newProvider === 'none') {
      setCloudProvider('none');
      setCloudToken(null);
      setCloudStatus('disconnected');
      setLastSyncTime(null);
      setCloudSyncProvider(null);
      setCloudAccessToken(null);
    } else {
      setState('exporting');
      setResultMessage(null);
      try {
        const token = await authenticateProvider(newProvider);
        setCloudProvider(newProvider);
        setCloudToken(token);
        setCloudStatus('connected');
        await setCloudSyncProvider(newProvider);
        await setCloudAccessToken(token);
        setState('idle');
        setResultMessage(`Connected to Google Drive.`);
      } catch (error) {
        if ((error as string) === 'redirecting') return;
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

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.05em] text-steel mb-1">Data Management</h2>
        <p className="text-xs text-steel">Backup, restore, and sync your job application data.</p>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Cloud Sync */}
        <Card variant="cream">
          <h3 className="text-sm font-semibold text-ink mb-1">Cloud Sync</h3>
          <p className="text-xs text-steel mb-4">
            {cloudStatus === 'connected' && lastSyncTime
              ? `Connected · last sync ${formatLastSync(lastSyncTime)}`
              : 'Sync your data automatically to Google Drive.'}
          </p>
          {cloudStatus === 'disconnected' ? (
            <button
              onClick={() => handleProviderChange('google')}
              disabled={state === 'exporting'}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-hairline-strong text-[14px] font-medium text-ink bg-white hover:bg-surface transition-colors disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 11.9556C2 8.47078 2 6.7284 2.67818 5.39739C3.27473 4.22661 4.22661 3.27473 5.39739 2.67818C6.7284 2 8.47078 2 11.9556 2H20.0444C23.5292 2 25.2716 2 26.6026 2.67818C27.7734 3.27473 28.7253 4.22661 29.3218 5.39739C30 6.7284 30 8.47078 30 11.9556V20.0444C30 23.5292 30 25.2716 29.3218 26.6026C28.7253 27.7734 27.7734 28.7253 26.6026 29.3218C25.2716 30 23.5292 30 20.0444 30H11.9556C8.47078 30 6.7284 30 5.39739 29.3218C4.22661 28.7253 3.27473 27.7734 2.67818 26.6026C2 25.2716 2 23.5292 2 20.0444V11.9556Z" fill="white"/>
                <path d="M16.0019 12.4507L12.541 6.34297C12.6559 6.22598 12.7881 6.14924 12.9203 6.09766C11.8998 6.43355 11.4315 7.57961 11.4315 7.57961L5.10895 18.7345C5.01999 19.0843 4.99528 19.4 5.0064 19.6781H11.9072L16.0019 12.4507Z" fill="#34A853"/>
                <path d="M16.002 12.4507L20.0967 19.6781H26.9975C27.0086 19.4 26.9839 19.0843 26.8949 18.7345L20.5724 7.57961C20.5724 7.57961 20.1029 6.43355 19.0835 6.09766C19.2145 6.14924 19.3479 6.22598 19.4628 6.34297L16.002 12.4507Z" fill="#FBBC05"/>
                <path d="M16.0019 12.4514L19.4628 6.34371C19.3479 6.22671 19.2144 6.14997 19.0835 6.09839C18.9327 6.04933 18.7709 6.01662 18.5954 6.00781H18.4125H13.5913H13.4084C13.2342 6.01536 13.0711 6.04807 12.9203 6.09839C12.7894 6.14997 12.6559 6.22671 12.541 6.34371L16.0019 12.4514Z" fill="#188038"/>
                <path d="M11.9082 19.6782L8.48687 25.7168C8.48687 25.7168 8.3732 25.6614 8.21875 25.5469C8.70434 25.9206 9.17633 25.9998 9.17633 25.9998H22.6134C23.3547 25.9998 23.5092 25.7168 23.5092 25.7168C23.5116 25.7155 23.5129 25.7142 23.5153 25.713L20.0965 19.6782H11.9082Z" fill="#4285F4"/>
                <path d="M11.9086 19.6782H5.00781C5.04241 20.4985 5.39826 20.9778 5.39826 20.9778L5.65773 21.4281C5.67627 21.4546 5.68739 21.4697 5.68739 21.4697L6.25205 22.461L7.51976 24.6676C7.55683 24.7569 7.60008 24.8386 7.6458 24.9166C7.66309 24.9431 7.67915 24.972 7.69769 24.9972C7.70263 25.0047 7.70757 25.0123 7.71252 25.0198C7.86944 25.2412 8.04489 25.4123 8.22034 25.5469C8.37479 25.6627 8.48847 25.7168 8.48847 25.7168L11.9086 19.6782Z" fill="#1967D2"/>
                <path d="M20.0967 19.6782H26.9974C26.9628 20.4985 26.607 20.9778 26.607 20.9778L26.3475 21.4281C26.329 21.4546 26.3179 21.4697 26.3179 21.4697L25.7532 22.461L24.4855 24.6676C24.4484 24.7569 24.4052 24.8386 24.3595 24.9166C24.3422 24.9431 24.3261 24.972 24.3076 24.9972C24.3026 25.0047 24.2977 25.0123 24.2927 25.0198C24.1358 25.2412 23.9604 25.4123 23.7849 25.5469C23.6305 25.6627 23.5168 25.7168 23.5168 25.7168L20.0967 19.6782Z" fill="#EA4335"/>
              </svg>
              Connect Google Drive
            </button>
          ) : (
            <Button
              variant="dark"
              onClick={handleSyncNow}
              disabled={cloudStatus !== 'connected' || syncing}
              className="w-full justify-center"
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
        </Card>

        {/* Export */}
        <Card variant="cream">
          <h3 className="text-sm font-semibold text-ink mb-1">Export Backup</h3>
          <p className="text-xs text-steel mb-4">Download a complete JSON snapshot of all your data.</p>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={state === 'exporting'}
            className="w-full justify-center"
          >
            {state === 'exporting' ? 'Exporting...' : 'Export'}
          </Button>
        </Card>

        {/* Import */}
        <Card variant="cream">
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
              <p className="text-xs text-ink">
                Ready to import <strong>{Object.keys(pendingPayload.data).length}</strong> items.
              </p>
              <select
                value={importStrategy}
                onChange={(e) => setImportStrategy(e.target.value as 'merge' | 'overwrite')}
                className="w-full px-3 py-2 text-sm border border-hairline-strong rounded-md bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="merge">Safe Merge</option>
                <option value="overwrite">Overwrite</option>
              </select>
              <div className="flex gap-2">
                <Button variant="primary" onClick={handleImportConfirm} disabled={state === 'importing'} className="flex-1 justify-center">
                  {state === 'importing' ? 'Importing...' : 'Confirm'}
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
              className="w-full justify-center"
            >
              {state === 'importing' ? 'Reading file...' : 'Select JSON File'}
            </Button>
          )}
        </Card>

      </div>

      {/* Result Messages */}
      {resultMessage && (
        <div
          className={`mt-4 text-sm px-4 py-3 rounded-md ${
            state === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          {resultMessage}
        </div>
      )}
    </div>
  );
}