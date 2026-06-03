export const metadata = {
  title: 'Install Extension — Job Foocus',
};

export default function ExtensionInstallPage() {
  return (
    <div className="max-w-[768px] mx-auto">
      <h1 className="text-[28px] font-semibold text-ink mb-2">Install the Extension</h1>
      <p className="text-[14px] text-steel mb-8">Five steps to get the JobFoocus browser extension running.</p>

      <div className="space-y-8 text-[15px] text-ink leading-relaxed">
        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-2">Step 1</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Open <code className="bg-stone-100 px-1.5 py-0.5 rounded text-sm font-mono">chrome://extensions</code> in Chrome
            (or <code className="bg-stone-100 px-1.5 py-0.5 rounded text-sm font-mono">edge://extensions</code> in Edge).
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-2">Step 2</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Enable <strong>Developer mode</strong> (toggle in the top-right corner).
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-2">Step 3</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Click <strong>Load unpacked</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-2">Step 4</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Select the <code className="bg-stone-100 px-1.5 py-0.5 rounded text-sm font-mono">extension/</code> folder from the project directory.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-2">Step 5</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Pin the extension to the toolbar (click the puzzle icon, then the pin icon next to JobFoocus).
          </p>
        </section>
      </div>
    </div>
  );
}
