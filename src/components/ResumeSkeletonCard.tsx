'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

function AISparkle({ className, delay }: { className?: string; delay: number }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="#fa520f"
      className={`${className || ''}`}
      style={{ animation: `aiSparkle 2s ease-in-out ${delay}s infinite` }}
    >
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16l-6.2 5.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}

const RESUMES = [
  {
    name: 'Sarah Okonkwo',
    title: 'Customer Service Representative · Toronto, ON',
    summary:
      'Results-driven professional with 3+ years of front-line customer support experience, specializing in hardware and software troubleshooting for Tier 1 and Tier 2 clients.',
    skills: 'Technical Support: Zendesk, Freshdesk, Salesforce, Visual ERP',
    company: 'TechSmith Solutions',
    date: '2022 – Present',
    bullets: [
      'Resolved 40+ escalated tickets per week with 94% satisfaction rating',
      'Trained 5 new support agents on CRM workflow and escalation protocols',
    ],
  },
  {
    name: 'Marcus Rivera',
    title: 'Technical Support Specialist · Vancouver, BC',
    summary:
      'Customer-focused technician with 4+ years of experience providing Tier 1 and Tier 2 hardware and software support for enterprise clients.',
    skills: 'Systems: Windows, macOS, Linux, JIRA, ServiceNow, Salesforce',
    company: 'NetWave Technologies',
    date: '2021 – Present',
    bullets: [
      'Managed a queue of 35+ daily tickets with 97% resolution rate within SLA',
      'Reduced average call handling time by 18% through updated FAQ documentation',
    ],
  },
  {
    name: 'Priya Nair',
    title: 'Help Desk Associate · Montreal, QC',
    summary:
      'Bilingual customer service professional with 2+ years of experience in high-volume call centers, specializing in client relationship management and issue escalation.',
    skills: 'CRM Tools: Zendesk, HubSpot, Freshdesk, Microsoft Office Suite',
    company: 'BlueRidge Corp',
    date: '2023 – Present',
    bullets: [
      'Handled 50+ inbound customer contacts per week with 95% satisfaction rating',
      'Collaborated with engineering to escalate and resolve 20+ complex tickets monthly',
    ],
  },
];

// Per-resume line definitions
type Line =
  | { kind: 'name' }
  | { kind: 'title' }
  | { kind: 'section'; label: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'skills'; label: string; value: string }
  | { kind: 'job-row'; company: string; date: string }
  | { kind: 'bullet'; text: string };

function buildLines(r: (typeof RESUMES)[0]): Line[] {
  return [
    { kind: 'name' },
    { kind: 'title' },
    { kind: 'section', label: 'Professional Summary' },
    { kind: 'paragraph', text: r.summary },
    { kind: 'section', label: 'Core Skills' },
    { kind: 'skills', label: r.skills.split(':')[0], value: r.skills.split(':')[1]?.trim() ?? '' },
    { kind: 'section', label: 'Experience' },
    { kind: 'job-row', company: r.company, date: r.date },
    { kind: 'bullet', text: r.bullets[0] },
    { kind: 'bullet', text: r.bullets[1] },
  ];
}

/** How many chars into the flat string does each line start? */
function buildLineStarts(lines: Line[], resumeText: { name: string; title: string }): number[] {
  const starts: number[] = [];
  let acc = 0;
  for (const line of lines) {
    starts.push(acc);
    if (line.kind === 'name') acc += resumeText.name.length;
    else if (line.kind === 'title') acc += resumeText.title.length;
    else if (line.kind === 'section') acc += 1;
    else if (line.kind === 'paragraph') acc += line.text.length;
    else if (line.kind === 'skills') acc += line.label.length + (line.value.length + 2);
    else if (line.kind === 'job-row') acc += line.company.length + line.date.length;
    else if (line.kind === 'bullet') acc += line.text.length;
  }
  return starts;
}

const TYPE_SPEED = 10;
const HOLD_MS = 800;
const SKELETON_MS = 500;

export default function ResumeSkeletonCard() {
  const [idx, setIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [phase, setPhase] = useState<'skeleton' | 'typing' | 'holding'>('skeleton');

  const cycleKeyRef = useRef(0);
  const resume = RESUMES[idx];
  const lines = useMemo(() => buildLines(resume), [resume]);
  const lineStarts = useMemo(
    () => buildLineStarts(lines, { name: resume.name, title: resume.title }),
    [lines, resume]
  );

  useEffect(() => {
    const cycleKey = ++cycleKeyRef.current;
    let typeTimer: ReturnType<typeof setTimeout>;
    let holdTimer: ReturnType<typeof setTimeout>;
    let typeInterval: ReturnType<typeof setInterval>;

    setPhase('skeleton');
    setChars(0);

    const maxChars = lineStarts[lineStarts.length - 1] + 1; // total + trailing newline

    // Wait SKELETON_MS, then start typing
    typeTimer = setTimeout(() => {
      if (cycleKey !== cycleKeyRef.current) return;

      setPhase('typing');
      typeInterval = setInterval(() => {
        if (cycleKey !== cycleKeyRef.current) {
          clearInterval(typeInterval);
          return;
        }
        setChars((prev) => {
          if (prev >= maxChars) {
            clearInterval(typeInterval);
            holdTimer = setTimeout(() => {
              if (cycleKey !== cycleKeyRef.current) return;
              // Reset to skeleton, advance to next resume after SKELETON_MS
              setPhase('skeleton');
              setChars(0);
              setTimeout(() => {
                if (cycleKey !== cycleKeyRef.current) return;
                setIdx((i) => (i + 1) % RESUMES.length);
              }, SKELETON_MS);
            }, HOLD_MS);
            return maxChars;
          }
          return prev + 1;
        });
      }, TYPE_SPEED);
    }, SKELETON_MS);

    return () => {
      clearTimeout(typeTimer);
      clearTimeout(holdTimer);
      clearInterval(typeInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  return (
    <>
      <style>{`
        @keyframes aiSparkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.1) rotate(15deg); }
        }
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, #ededed 25%, #f5f5f5 50%, #ededed 75%);
          background-size: 800px 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>

      {phase === 'skeleton' ? (
        /* ---- Skeleton ---- */
        <div className="bg-white rounded-xl border border-hairline-soft shadow-[rgba(0,0,0,0.06)_0px_8px_24px] p-8 overflow-hidden relative">
          <div className="absolute top-4 right-4 flex flex-col gap-1">
            <AISparkle delay={0} />
            <AISparkle delay={0.4} />
            <AISparkle delay={0.8} />
          </div>
          <div className="absolute bottom-4 left-4 flex flex-col gap-1">
            <AISparkle delay={1.2} />
            <AISparkle delay={0.6} />
          </div>

          <div className="flex items-center gap-2 mb-6">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ededed' }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ededed' }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ededed' }} />
          </div>

          <div className="flex items-center gap-2 mb-6">
            <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: '#fa520f' }} />
            <div className="h-3 flex-1 rounded-full shimmer max-w-[120px]" />
          </div>

          <div className="flex justify-center mb-1">
            <div className="h-7 w-44 rounded-full shimmer" />
          </div>
          <div className="flex justify-center mb-5">
            <div className="h-3 w-64 rounded-full shimmer" />
          </div>

          <div className="h-px bg-hairline-soft mb-5" />

          <div className="h-3 w-32 rounded-full shimmer mb-3" />
          <div className="space-y-2 mb-5">
            <div className="h-3 w-full rounded-full shimmer" />
            <div className="h-3 w-5/6 rounded-full shimmer" />
            <div className="h-3 w-4/6 rounded-full shimmer shimmer" />
          </div>

          <div className="h-3 w-20 rounded-full shimmer mb-3" />
          <div className="space-y-2 mb-5">
            <div className="h-3 w-full rounded-full shimmer" />
            <div className="h-3 w-3/4 rounded-full shimmer" />
          </div>

          <div className="h-px bg-hairline-soft mb-4" />

          <div className="h-3 w-20 rounded-full shimmer mb-4" />
          <div className="space-y-4">
            <div className="flex justify-between">
              <div className="h-3 w-36 rounded-full shimmer" />
              <div className="h-3 w-24 rounded-full shimmer" />
            </div>
            <div className="space-y-2 ml-3">
              <div className="h-3 w-full rounded-full shimmer" />
              <div className="h-3 w-5/6 rounded-full shimmer" />
            </div>
          </div>
        </div>
      ) : (
        /* ---- Typewriter reveal ---- */
        <div className="bg-white rounded-xl border border-hairline-soft shadow-[rgba(0,0,0,0.06)_0px_8px_24px] p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>

          <div className="text-left">
            {lines.map((line, i) => {
              const lineStart = lineStarts[i];
              const lineEnd =
                i < lineStarts.length - 1
                  ? lineStarts[i + 1]
                  : lineStarts[lineStarts.length - 1] + 1;
              const lineLen = lineEnd - lineStart;
              const visible = chars - lineStart;
              const done = visible >= lineLen;
              const lineText =
                done
                  ? line.kind === 'name'
                    ? resume.name
                    : line.kind === 'title'
                    ? resume.title
                    : line.kind === 'section'
                    ? line.label
                    : line.kind === 'paragraph'
                    ? resume.summary
                    : line.kind === 'skills'
                    ? `${line.label}: ${line.value}`
                    : line.kind === 'job-row'
                    ? line.company
                    : line.kind === 'bullet'
                    ? line.text
                    : ''
                  : done
                  ? ''
                  : (() => {
                      const raw = chars >= lineStart
                        ? chars < lineEnd
                          ? chars - lineStart
                          : lineLen
                        : 0;
                      const t =
                        line.kind === 'name'
                          ? resume.name
                          : line.kind === 'title'
                          ? resume.title
                          : line.kind === 'paragraph'
                          ? resume.summary
                          : line.kind === 'skills'
                          ? `${line.label}: ${line.value}`
                          : line.kind === 'job-row'
                          ? line.company
                          : line.kind === 'bullet'
                          ? line.text
                          : '';
                      return t.slice(0, raw);
                    })();

              if (line.kind === 'name') {
                return (
                  <p
                    key={i}
                    className="text-[22px] font-bold text-ink mb-1 text-center"
                    style={{ fontFamily: 'PP Editorial Old, serif', letterSpacing: '0.5px' }}
                  >
                    {lineText}
                  </p>
                );
              }
              if (line.kind === 'title') {
                return (
                  <p key={i} className="text-[11px] text-steel mb-5 text-center">
                    {lineText}
                  </p>
                );
              }
              if (line.kind === 'section') {
                return done || visible > 0 ? (
                  <p key={i} className="text-[11px] font-semibold uppercase tracking-wider text-steel mb-2">
                    {lineText}
                  </p>
                ) : (
                  <div key={i} className="h-3 w-20 rounded-full shimmer mb-3 shimmer" />
                );
              }
              if (line.kind === 'paragraph') {
                return done || visible > 0 ? (
                  <p key={i} className="text-[12px] text-steel leading-relaxed mb-4">
                    {lineText}
                  </p>
                ) : (
                  <div key={i} className="mb-4 space-y-2">
                    <div className="h-3 w-full rounded-full shimmer" />
                    <div className="h-3 w-5/6 rounded-full shimmer" />
                  </div>
                );
              }
              if (line.kind === 'skills') {
                return done || visible > 0 ? (
                  <p key={i} className="text-[12px] text-steel mb-3">
                    <span className="font-semibold text-ink">{line.label}: </span>
                    {lineText.split(': ')[1] ?? lineText}
                  </p>
                ) : (
                  <div key={i} className="h-3 w-full rounded-full shimmer mb-3" />
                );
              }
              if (line.kind === 'job-row') {
                if (done) {
                  return (
                    <div key={i} className="flex justify-between items-baseline mb-1">
                      <span className="text-[12px] font-semibold text-ink">{line.company}</span>
                      <span className="text-[11px] text-steel">{line.date}</span>
                    </div>
                  );
                }
                return (
                  <div key={i} className="flex justify-between mb-3">
                    <div className="h-3 w-36 rounded-full shimmer" />
                    <div className="h-3 w-24 rounded-full shimmer" />
                  </div>
                );
              }
              if (line.kind === 'bullet') {
                if (done) {
                  return (
                    <li key={i} className="text-[11px] text-steel" style={{ marginLeft: '1rem' }}>
                      {line.text}
                    </li>
                  );
                }
                return (
                  <li key={i} className="text-[11px] text-steel shimmer opacity-30" style={{ marginLeft: '1rem', listStyle: 'none' }}>
                    {line.text}
                  </li>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </>
  );
}
