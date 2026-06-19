'use client';

interface PrintGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  filename: string;
  busy?: boolean;
}

export default function PrintGuide({ isOpen, onClose, onConfirm, filename, busy }: PrintGuideProps) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--scrim)' }}
      onClick={onClose}
    >
      <div
        className="bg-surface border border-hairline rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[18px] font-semibold text-ink mb-1">Export as PDF</h2>
        <p className="text-[13px] text-steel mb-4">
          We'll open a clean preview window so you can save it as a PDF. For the best output, use these settings in the print dialog.
        </p>

        <ol className="space-y-2 text-[13px] text-ink mb-5">
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] font-semibold flex items-center justify-center">1</span>
            <span><strong>Destination:</strong> choose <em>Save as PDF</em></span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] font-semibold flex items-center justify-center">2</span>
            <span><strong>Paper size:</strong> A4</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] font-semibold flex items-center justify-center">3</span>
            <span><strong>Margins:</strong> None (your document already includes its own margins)</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] font-semibold flex items-center justify-center">4</span>
            <span><strong>Background graphics:</strong> ON (so colors and colored bars render)</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] font-semibold flex items-center justify-center">5</span>
            <span><strong>Headers and footers:</strong> OFF (uncheck if your browser shows this option)</span>
          </li>
        </ol>

        <p className="text-[12px] text-steel mb-5">
          The file will be saved as <span className="font-mono text-ink">{filename}.pdf</span>.
        </p>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-[13px] font-medium text-steel hover:text-ink rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 text-[13px] font-semibold rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy ? 'Opening…' : 'Open print dialog'}
          </button>
        </div>
      </div>
    </div>
  );
}
