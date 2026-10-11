import Image from 'next/image';
import Link from 'next/link';

const features = [
  { image: 'resume', title: 'Documents tailored to each role', text: 'Use your master resume and a job description to create an ATS-friendly resume and cover letter. Review and export them before you apply.' },
  { image: 'capture', title: 'Save jobs while you browse', text: 'Capture the job title, company, and description with the browser extension. You can also paste a description directly into JobFoocus.' },
  { image: 'tracking', title: 'Keep every application in focus', text: 'Organize roles by category, update their status, and find the applications that need a follow-up. Keep each role’s documents together.' },
  { image: 'editing', title: 'Refine your documents with AI', text: 'Ask for a clearer summary or more emphasis on relevant experience. Review the changes in the document editor before exporting.' },
];

export default function FeaturesPageContent() {
  return <div className="features-page"><div className="text-center max-w-[640px] mx-auto mb-10"><span className="eyebrow">Built around your job hunt</span><h1 className="mt-5">Prepare your next application.<br />Keep it all together.</h1><p className="text-steel">From a saved job to tailored documents and a clear view of your progress.</p></div><div className="feature-grid">{features.map(feature => <article className="feature" key={feature.image}><div className="feature-art"><Image src={`/images/redesign/${feature.image}.webp`} alt="" width={1254} height={1254} sizes="(max-width:700px) 85vw, 500px" /></div><div className="feature-copy"><h2>{feature.title}</h2><p>{feature.text}</p></div></article>)}</div><div className="text-center mt-12"><Link href="/signup" className="button">Start for free →</Link><p className="text-sm text-steel mt-3">Bring your master resume. Add your first role.</p></div></div>;
}
