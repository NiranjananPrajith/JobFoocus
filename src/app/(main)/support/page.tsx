import FaqSection from './FaqSection';

export const metadata = {
  title: 'Support — Job Foocus',
};

export default function SupportPage() {
  return (
    <div className="max-w-[768px] mx-auto">
      {/* Hero */}
      <div className="mb-14">
        <h1 className="text-[28px] font-semibold text-ink mb-2">How can we help?</h1>
        <p className="text-[15px] text-steel leading-relaxed">
          Everything you need to get started with Job Foocus — from installing the extension to landing your next interview.
        </p>
      </div>

      <div className="space-y-12 text-[15px] text-ink leading-relaxed">

        {/* ── Getting Started ── */}
        <section>
          <h2 className="text-[20px] font-semibold text-ink mb-4">Getting Started</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">What is Job Foocus?</h3>
              <p className="text-[15px] text-steel leading-relaxed">
                Job Foocus is a job-application workspace that helps you track, tailor, and manage your entire job search in one place. Drop in your master resume, paste a job description (or send one from the browser extension), and Job Foocus generates a tailored resume and cover letter for each job — filed and organized automatically.
              </p>
            </div>

            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">Quick start (3 steps)</h3>
              <ol className="list-decimal list-inside space-y-2 text-steel">
                <li><span className="text-ink font-medium">Create a free account</span> at <a href="https://jobfoocus.com" className="text-primary hover:underline">jobfoocus.com</a> — no credit card required</li>
                <li><span className="text-ink font-medium">Upload your master resume</span> — this is the base resume Job Foocus tailors from</li>
                <li><span className="text-ink font-medium">Add your first job</span> — paste a job description or use the browser extension to capture it from any job board</li>
              </ol>
              <p className="text-steel mt-2">That&apos;s it. Job Foocus handles the rest.</p>
            </div>
          </div>
        </section>

        {/* ── Using the Website ── */}
        <section>
          <h2 className="text-[20px] font-semibold text-ink mb-4">Using the Website</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">Adding a job manually</h3>
              <ol className="list-decimal list-inside space-y-1 text-steel">
                <li>Go to your <span className="text-ink font-medium">Dashboard</span></li>
                <li>Click <span className="text-ink font-medium">&quot;Add Job&quot;</span> (top right, or in the navigation bar)</li>
                <li>Paste the job description, company name, and job title</li>
                <li>Click <span className="text-ink font-medium">Save</span> — Job Foocus files it under <code className="text-[13px] bg-surface px-1.5 py-0.5 rounded">YYYY-MM-DD_Company_Title</code></li>
              </ol>
            </div>

            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">Generating a tailored resume and cover letter</h3>
              <ol className="list-decimal list-inside space-y-1 text-steel">
                <li>Open a job from your dashboard</li>
                <li>Click <span className="text-ink font-medium">&quot;Save and generate resume &amp; cover letter&quot;</span></li>
                <li>Job Foocus creates a tailored resume and cover letter based on your master resume and the job description</li>
                <li>Review, edit if needed, and download as PDF</li>
              </ol>
            </div>

            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">Using the AI document editor</h3>
              <ol className="list-decimal list-inside space-y-1 text-steel">
                <li>Open any generated document</li>
                <li>Click <span className="text-ink font-medium">&quot;Edit with AI&quot;</span> (floating yellow panel)</li>
                <li>Type what you want changed — &quot;Make the skills section more relevant to this role&quot; or &quot;Shorten the cover letter to one page&quot;</li>
                <li>Job Foocus applies the edit and shows you the result</li>
              </ol>
            </div>

            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">Organizing with categories</h3>
              <ol className="list-decimal list-inside space-y-1 text-steel">
                <li>Go to <span className="text-ink font-medium">Dashboard → Categories</span> (left sidebar)</li>
                <li>Create custom categories (e.g., &quot;Remote Roles&quot;, &quot;Senior Positions&quot;, &quot;Applied&quot;)</li>
                <li>Assign jobs to categories as you track them</li>
                <li>Filter your dashboard by category</li>
              </ol>
            </div>

            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">Tracking application status</h3>
              <p className="text-steel mb-2">Each job has a status you can update as your application progresses:</p>
              <ul className="list-disc list-inside space-y-1 text-steel">
                <li><span className="text-ink font-medium">Prospect</span> — Job found, not yet applied</li>
                <li><span className="text-ink font-medium">Applied</span> — Application submitted</li>
                <li><span className="text-ink font-medium">Phone Screen</span> — Phone screen scheduled or completed</li>
                <li><span className="text-ink font-medium">Interview</span> — You have an interview scheduled</li>
                <li><span className="text-ink font-medium">Offer</span> — You received an offer</li>
                <li><span className="text-ink font-medium">Rejected</span> — Application was not successful</li>
              </ul>
              <p className="text-steel mt-2">Update the status from the job card on your dashboard.</p>
            </div>
          </div>
        </section>

        {/* ── Using the Browser Extension ── */}
        <section>
          <h2 className="text-[20px] font-semibold text-ink mb-4">Using the Browser Extension</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">Supported browsers</h3>
              <p className="text-steel">The Job Foocus extension works on:</p>
              <ul className="list-disc list-inside space-y-1 text-steel mt-2">
                <li><span className="text-ink font-medium">Chrome</span> (version 88+)</li>
                <li><span className="text-ink font-medium">Edge</span> (version 88+)</li>
                <li><span className="text-ink font-medium">Brave</span></li>
                <li><span className="text-ink font-medium">Firefox</span> (version 109+)</li>
              </ul>
            </div>

            {/* TODO: Uncomment and fill in store links once extension is published
            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">Installing the extension</h3>

              <h4 className="text-[15px] font-semibold text-ink mb-1">From the Chrome Web Store:</h4>
              <ol className="list-decimal list-inside space-y-1 text-steel mb-4">
                <li>Go to the <a href="CHROME_STORE_URL_HERE" className="text-primary hover:underline">Job Foocus Chrome Web Store page</a></li>
                <li>Click <span className="text-ink font-medium">&quot;Add to Chrome&quot;</span></li>
                <li>Confirm the permissions</li>
                <li>Pin the extension to your toolbar (click the puzzle icon → pin)</li>
              </ol>

              <h4 className="text-[15px] font-semibold text-ink mb-1">From Firefox Add-ons:</h4>
              <ol className="list-decimal list-inside space-y-1 text-steel">
                <li>Go to the <a href="FIREFOX_ADDONS_URL_HERE" className="text-primary hover:underline">Job Foocus Firefox Add-ons page</a></li>
                <li>Click <span className="text-ink font-medium">&quot;Add to Firefox&quot;</span></li>
                <li>Confirm the permissions</li>
                <li>Pin the extension to your toolbar</li>
              </ol>
            </div>
            */}

            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">How to capture a job posting</h3>
              <p className="text-steel mb-2">There are three ways to capture a job:</p>

              <h4 className="text-[15px] font-semibold text-ink mb-1">Method 1: Click the extension icon</h4>
              <ol className="list-decimal list-inside space-y-1 text-steel mb-4">
                <li>Navigate to any job posting (LinkedIn, Indeed, Glassdoor, company career page, etc.)</li>
                <li>Click the <span className="text-ink font-medium">Job Foocus icon</span> in your toolbar</li>
                <li>Click <span className="text-ink font-medium">&quot;Add Job&quot;</span></li>
                <li>The extension extracts the job title, company, description, location, and salary</li>
                <li>Your Job Foocus dashboard opens with the job details pre-filled</li>
              </ol>

              <h4 className="text-[15px] font-semibold text-ink mb-1">Method 2: Right-click shortcut</h4>
              <ol className="list-decimal list-inside space-y-1 text-steel mb-4">
                <li>Navigate to any job posting</li>
                <li><span className="text-ink font-medium">Right-click</span> anywhere on the page</li>
                <li>Select <span className="text-ink font-medium">&quot;Send page to Job Foocus&quot;</span></li>
                <li>The job is captured immediately — no popup needed</li>
              </ol>

              <h4 className="text-[15px] font-semibold text-ink mb-1">Method 3: Keyboard shortcut</h4>
              <p className="text-steel">
                <span className="text-ink font-medium">Windows/Linux:</span> <kbd className="text-[13px] bg-surface px-1.5 py-0.5 rounded font-mono">Ctrl+Shift+J</kbd>
                <span className="mx-2 text-steel">|</span>
                <span className="text-ink font-medium">Mac:</span> <kbd className="text-[13px] bg-surface px-1.5 py-0.5 rounded font-mono">Cmd+Shift+J</kbd>
              </p>
              <p className="text-steel mt-1">The extension opens instantly and you can click &quot;Add Job&quot; from there.</p>
            </div>

            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">What the extension reads</h3>
              <p className="text-steel">
                The extension <span className="text-ink font-medium">only reads page content when you click &quot;Add Job&quot; or use the right-click shortcut.</span> It never:
              </p>
              <ul className="list-disc list-inside space-y-1 text-steel mt-2">
                <li>Tracks your browsing activity</li>
                <li>Reads cookies or session data from other websites</li>
                <li>Collects data passively or in the background</li>
              </ul>
              <p className="text-steel mt-2">See our <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a> for full details.</p>
            </div>
          </div>
        </section>

        {/* ── Your Account ── */}
        <section>
          <h2 className="text-[20px] font-semibold text-ink mb-4">Your Account</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">Managing your subscription</h3>
              <ol className="list-decimal list-inside space-y-1 text-steel">
                <li>Click the <span className="text-ink font-medium">credit card icon</span> in the top-right of the navigation bar</li>
                <li>From here you can:
                  <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                    <li><span className="text-ink font-medium">Upgrade</span> (free tier) — opens the pricing page</li>
                    <li><span className="text-ink font-medium">Manage Subscription</span> (paid tiers) — opens the Stripe Customer Portal where you can update payment method, switch plans, or cancel</li>
                    <li><span className="text-ink font-medium">Account and Billing</span> — opens your account page with usage details</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">Daily usage limits</h3>
              <p className="text-steel mb-2">Your tier determines how many jobs and document edits you can make per day:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-hairline-soft">
                      <th className="py-2 pr-4 font-semibold text-ink">Tier</th>
                      <th className="py-2 pr-4 font-semibold text-ink">Jobs per day</th>
                      <th className="py-2 pr-4 font-semibold text-ink">Document edits per day</th>
                      <th className="py-2 font-semibold text-ink">Price</th>
                    </tr>
                  </thead>
                  <tbody className="text-steel">
                    <tr className="border-b border-hairline-soft">
                      <td className="py-2 pr-4 font-medium text-ink">Free</td>
                      <td className="py-2 pr-4">5</td>
                      <td className="py-2 pr-4">25</td>
                      <td className="py-2">$0</td>
                    </tr>
                    <tr className="border-b border-hairline-soft">
                      <td className="py-2 pr-4 font-medium text-ink">Pro</td>
                      <td className="py-2 pr-4">25</td>
                      <td className="py-2 pr-4">150</td>
                      <td className="py-2">$5/mo</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-ink">Max</td>
                      <td className="py-2 pr-4">250</td>
                      <td className="py-2 pr-4">500</td>
                      <td className="py-2">$12/mo</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-steel mt-2">Limits reset daily at midnight UTC.</p>
            </div>

            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">Exporting your data</h3>
              <p className="text-steel">Go to <span className="text-ink font-medium">Account → Export Data</span> to download all your job applications, documents, master resume, and settings as a single JSON file.</p>
            </div>

            <div>
              <h3 className="text-[16px] font-semibold text-ink mb-2">Deleting your account</h3>
              <p className="text-steel">To permanently delete your account and all associated data:</p>
              <ol className="list-decimal list-inside space-y-1 text-steel mt-2">
                <li>Go to <span className="text-ink font-medium">Account</span></li>
                <li>Scroll to the <span className="text-ink font-medium">Data &amp; Privacy</span> section</li>
                <li>Click <span className="text-ink font-medium">&quot;Delete Account&quot;</span></li>
                <li>Type <code className="text-[13px] bg-surface px-1.5 py-0.5 rounded">DELETE</code> to confirm</li>
              </ol>
              <p className="text-steel mt-2">This action is permanent and cannot be undone. All your resumes, cover letters, and application data will be permanently removed.</p>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <FaqSection />

        {/* ── Contact ── */}
        <section className="border-t border-hairline-soft pt-10">
          <h2 className="text-[20px] font-semibold text-ink mb-3">Still need help?</h2>
          <p className="text-steel mb-4">
            If you have questions, run into issues, or just want to say hello — reach out to us.
          </p>
          <a
            href="mailto:support@jobfoocus.com"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 7l-10 6L2 7" />
            </svg>
            support@jobfoocus.com
          </a>
          <p className="text-[13px] text-steel mt-2">We typically respond within 24 hours on business days.</p>
        </section>

      </div>
    </div>
  );
}
