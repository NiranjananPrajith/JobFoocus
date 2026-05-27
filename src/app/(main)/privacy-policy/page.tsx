export const metadata = {
  title: 'Privacy Policy — Job Foocus',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-[768px] mx-auto">
      <h1 className="text-[28px] font-semibold text-ink mb-2">Privacy Policy</h1>
      <p className="text-[14px] text-steel mb-10">Last updated: May 26, 2026</p>

      <div className="space-y-8 text-[15px] text-ink leading-relaxed">
        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">1. Information We Collect</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Job Foocus collects information you provide directly, including your master resume data, job application details, contact information, and any other materials you upload or generate through the platform. We also collect minimal usage data such as job additions, document views, and feature interactions to improve the service.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">2. How We Use Your Information</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Your information is used to generate tailored job application documents (resumes and cover letters), track your job search progress, and provide personalized recommendations. We do not sell your personal data to third parties. Your documents and application data are stored securely and used solely to power your job search workflow.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">3. AI Document Generation</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Job Foocus uses the MiniMax API (Anthropic API compatibility endpoint) to generate tailored resumes and cover letters. Your job description and master resume data are sent to this API solely for the purpose of document generation. We do not use your data to train AI models.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">4. Data Storage and Security</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Application and document data is stored in your browser's local storage (via the browser extension) or in the cloud storage adapter you configure. Your master resume and job documents are accessible only to you. We implement reasonable security measures to protect your data, but no method of electronic storage is 100% secure. You are responsible for keeping your API credentials and access tokens secure.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">5. Cookies and Tracking</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Job Foocus does not use third-party tracking cookies. We use essential session and preference cookies necessary for the application to function. Local storage is used to persist your application data, preferences, and session state within the browser extension environment.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">6. Third-Party Services</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Our AI document generation is powered by MiniMax. When you use the platform, your job description and master resume data are temporarily sent to MiniMax's API solely for generating your tailored documents. Their use of your data is governed by MiniMax's own privacy policy. Job Foocus is not responsible for the privacy practices of third-party services you connect (such as cloud storage providers) beyond what is described in this policy.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">7. Data Retention</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Your data remains in your control at all times. You can delete your application data, master resume, and generated documents at any time through the application interface or by uninstalling the browser extension, which clears locally stored data. We retain anonymized, aggregated usage statistics for service improvement purposes only.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">8. Your Rights</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            You retain full ownership and control of all data you provide to Job Foocus. You may request deletion of your personal data at any time by contacting us. You have the right to access, correct, or delete any personal information stored, and the right to data portability for your application documents.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">9. Children's Privacy</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            Job Foocus is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that personal information from a minor has been collected without verified parental consent, we will take steps to delete that information promptly.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">10. Changes to This Policy</h2>
          <p className="text-[15px] text-steel leading-relaxed">
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. Any material changes will be communicated by updating the "Last updated" date at the top of this page and, when significant, through a notice in the application. We encourage you to review this policy periodically.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink mb-3">11. Contact Us</h2>
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
