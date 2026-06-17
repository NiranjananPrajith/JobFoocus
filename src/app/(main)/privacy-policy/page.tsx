export const metadata = {
  title: 'Privacy Policy — Job Foocus',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-[768px] mx-auto">
      <h1 className="text-[28px] font-semibold text-ink mb-2">Privacy Policy</h1>
      <p className="text-[14px] text-steel mb-10">Last updated: June 11, 2026</p>

      <div className="space-y-8 text-[15px] text-ink leading-relaxed">
        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">1. Information We Collect</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Job Foocus collects information you provide directly, including your master resume data, job application details, contact information, and any other materials you upload or generate through the platform. We also collect minimal usage data such as job additions, document views, and feature interactions to improve the service. When you use the browser extension and click "Add Job", the extension reads the content of the current web page to extract job posting details (title, company, description, location, salary) and sends them to jobfoocus.com to create a tracked job application. No page content is read or collected without your explicit action.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">2. How We Use Your Information</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Your information is used to generate tailored job application documents (resumes and cover letters), track your job search progress, and provide personalized recommendations. We do not sell your personal data to third parties. Your documents and application data are stored securely and used solely to power your job search workflow.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">3. Browser Extension</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            The JobFoocus browser extension reads content from the current web page only when you click the "Add Job" button or use the right-click context menu option "Send page to JobFoocus". The extension extracts publicly visible job posting information — including job title, company name, job description, location, salary range, and posting date — and sends it to jobfoocus.com to create a tracked job application in your dashboard.
          </p>
          <p className="text-[15px] text-steel leading-relaxed mt-3">
            The extension does not collect, read, or transmit any page content passively or in the background. It does not track your browsing activity, access cookies or session data from other websites, or share any data with third parties. All data extracted by the extension is used solely to populate your JobFoocus application records.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">4. AI Document Generation</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Job Foocus uses its JobFoocus AI system to generate tailored resumes and cover letters. Your job description and master resume data are sent to our AI service solely for the purpose of document generation. We do not use your data to train AI models.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">5. Data Storage and Security</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Application and document data is stored in the cloud storage adapter you configure. Your master resume and job documents are accessible only to you. We implement reasonable security measures to protect your data, but no method of electronic storage is 100% secure. You are responsible for keeping your API credentials and access tokens secure.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">6. Cookies and Tracking</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Job Foocus does not use third-party tracking cookies. We use essential session and preference cookies necessary for the application to function. Local storage is used to persist your application data, preferences, and session state within the browser extension environment.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">7. Third-Party Services</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Our AI document generation is powered by JobFoocus AI. When you use the platform, your job description and master resume data are temporarily processed by our AI system solely for generating your tailored documents. Job Foocus is not responsible for the privacy practices of third-party services you connect (such as cloud storage providers) beyond what is described in this policy.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">8. Data Retention</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Your data remains in your control at all times. You can export all your data (job applications, documents, master resume, and settings) as a JSON file from the Account page. You can also permanently delete your account and all associated data from the Account page at any time. We retain anonymized, aggregated usage statistics for service improvement purposes only.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">9. Your Rights</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            You retain full ownership and control of all data you provide to Job Foocus. You can export your data or permanently delete your account from the Account page. You also have the right to contact us at{' '}
            <a href="mailto:privacy@jobfoocus.com" className="text-primary hover:underline">
              privacy@jobfoocus.com
            </a>{' '}
            for any data-related requests.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">10. Children's Privacy</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Job Foocus is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that personal information from a minor has been collected without verified parental consent, we will take steps to delete that information promptly.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">11. Changes to This Policy</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. Any material changes will be communicated by updating the "Last updated" date at the top of this page and, when significant, through a notice in the application. We encourage you to review this policy periodically.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">12. Contact Us</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            If you have questions, concerns, or requests related to this Privacy Policy or our data practices, please contact us at{' '}
            <a href="mailto:privacy@jobfoocus.com" className="text-primary hover:underline">
              privacy@jobfoocus.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
