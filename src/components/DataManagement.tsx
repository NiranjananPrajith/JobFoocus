'use client';

import { useEffect, useState, useRef } from 'react';
import { exportAllData, importAllData, type BackupPayload } from '@/lib/storage-adapter';
import Button from '@/components/design/Button';
import Card from '@/components/design/Card';
import SunsetStripeBand from '@/components/design/sunset-stripe-band';

type DataMgmtState = 'idle' | 'exporting' | 'importing' | 'success' | 'error';

export default function DataManagement() {
  const [state, setState] = useState<DataMgmtState>('idle');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [importStrategy, setImportStrategy] = useState<'merge' | 'overwrite'>('merge');
  const [pendingPayload, setPendingPayload] = useState<BackupPayload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setResultMessage(`Backup exported successfully — ${Object.keys(backup.data).length} items saved.`);
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

    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          : `Merged successfully — ${result.itemsImported} items imported, existing data preserved.`
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[12px] font-bold uppercase tracking-[0.05em] text-steel mb-1">Data Management</h2>
        <p className="text-xs text-steel">Backup and restore your job application data.</p>
      </div>

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

        {/* Hidden file input triggered by button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />

        {pendingPayload ? (
          // Strategy confirmation
          <div className="space-y-3">
            <p className="text-sm text-ink">
              Ready to import <strong>{Object.keys(pendingPayload.data).length}</strong> items from backup.
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