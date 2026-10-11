import Image from "next/image";
import Link from "next/link";
import HeroArtwork from "./components/HeroArtwork";

export default function MarketingLandingPage() {
  return (
<main id="main">
      <section className="hero container" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <span className="eyebrow">Your job hunt, made simpler</span>
          <h1 id="hero-heading">Your resume.<br /><span>Tailored to<br />every job.</span></h1>
          <p>Create a resume and cover letter for each role, then track your applications in one place.</p>
          <div className="actions"><Link className="button" href="/signup">Start for free →</Link><a className="button secondary" href="#how-it-works">See how it works</a></div>
          <p className="fine">Start with your master resume. No credit card required.</p>
        </div>
        <HeroArtwork />
      </section>
      <div className="capabilities container" aria-label="Product capabilities"><span><b>✓</b> ATS-friendly resumes</span><span><b>✓</b> AI-assisted editing</span><span><b>✓</b> Application tracking</span><span><b>✓</b> Browser extension</span></div>
      <section className="section container" id="how-it-works" aria-labelledby="workflow-heading">
        <div className="section-title"><span className="eyebrow">Three simple steps</span><h2 id="workflow-heading">From job posting<br />to a ready application.</h2><p>Add your master resume once. Use it to tailor your documents whenever you find a role.</p></div>
        <div className="steps">
          <article className="step"><span className="step-number">1</span><h3>Save a job</h3><p>Capture a posting with the extension, or paste the job description.</p></article>
          <article className="step"><span className="step-number">2</span><h3>Tailor your documents</h3><p>Generate a resume and cover letter for the role. Review and export them.</p></article>
          <article className="step"><span className="step-number">3</span><h3>Track your progress</h3><p>Update application statuses and keep follow-ups within reach.</p></article>
        </div>
      </section>
      <section className="section container features-section" id="features" aria-labelledby="features-heading">
        <div className="section-title"><span className="eyebrow">Built around your job hunt</span><h2 id="features-heading">Your documents and applications.<br />All together.</h2><p>Prepare each application, keep it organized, and see what needs your attention next.</p></div>
        <div className="feature-grid">
          <article className="feature"><div className="feature-art"><Image src="/images/redesign/resume.webp" alt="Two softly rounded resume pages with selected orange highlights" width={1254} height={1254} sizes="(max-width: 700px) 85vw, 500px" loading="lazy" /></div><div className="feature-copy"><h3>Tailored resumes &amp; cover letters</h3><p>Create a resume and cover letter for each role using your master resume and the job description.</p></div></article>
          <article className="feature"><div className="feature-art"><Image src="/images/redesign/capture.webp" alt="A rounded browser window with an orange bookmark" width={1254} height={1254} sizes="(max-width: 700px) 85vw, 500px" loading="lazy" /></div><div className="feature-copy"><h3>Save jobs from your browser</h3><p>Use the browser extension to save the job title, company, and description directly to your workspace.</p></div></article>
          <article className="feature"><div className="feature-art"><Image src="/images/redesign/tracking.webp" alt="Application cards organized across three softly rounded panels" width={1254} height={1254} sizes="(max-width: 700px) 85vw, 500px" loading="lazy" /></div><div className="feature-copy"><h3>Track applications &amp; follow-ups</h3><p>Keep your jobs and documents together, update application statuses, and see which roles need a follow-up.</p></div></article>
          <article className="feature"><div className="feature-art"><Image src="/images/redesign/editing.webp" alt="A softly curved document page beside an orange pencil" width={1254} height={1254} sizes="(max-width: 700px) 85vw, 500px" loading="lazy" /></div><div className="feature-copy"><h3>Refine documents with AI</h3><p>Request changes to your resume or cover letter, such as a clearer summary or stronger emphasis on relevant experience. Review the result before exporting.</p></div></article>
        </div>
      </section>
      <section className="section container" id="questions" aria-labelledby="questions-heading">
        <div className="section-title"><h2 id="questions-heading">A few helpful answers.</h2></div>
        <div className="faq">
          <details><summary>What do I need to get started?</summary><p>Your master resume and a job description. Your master resume holds your experience; JobFoocus uses it to tailor your documents for each role.</p></details>
          <details><summary>Can I edit the generated documents?</summary><p>Yes. Review your resume and cover letter in the document editor and request changes with AI before exporting.</p></details>
          <details><summary>Do I have to use the browser extension?</summary><p>No. You can also add a job by pasting its description. The extension helps you capture job details while browsing.</p></details>
          <details><summary>Does JobFoocus submit applications for me?</summary><p>You review and export your documents, then submit your application yourself. JobFoocus helps you prepare the documents and track your progress.</p></details>
        </div>
      </section>
      <section className="closing" aria-labelledby="closing-heading"><span className="eyebrow">One less thing to juggle</span><h2 id="closing-heading">Get your next<br />application ready.</h2><p>Bring your resume. Find a role. Create documents that fit.</p><Link className="button" href="/signup">Start for free →</Link></section>
    </main>
  );
}
