'use client';

import { useEffect, useState } from 'react';
import { getAllApplications, getMasterResume, getLocalData, type EnrichedApplication } from '@/lib/storage-adapter';
import Button from '@/components/design/Button';
import Card from '@/components/design/Card';
import SunsetStripeBand from '@/components/design/sunset-stripe-band';

type AssistantState = 'idle' | 'loading' | 'ready' | 'generating' | 'success' | 'error' | 'no_match';

interface AssistantContext {
  url: string | null;
  question: string | null;
}

export default function SidePanelPage() {
  const [state, setState] = useState<AssistantState>('idle');
  const [context, setContext] = useState<AssistantContext>({ url: null, question: null });
  const [matchedJob, setMatchedJob] = useState<EnrichedApplication | null>(null);
  const [question, setQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load initial context from storage on mount
  useEffect(() => {
    async function loadContext() {
      setState('loading');

      try {
        const storedUrl = await getLocalData('assistant_url');
        const storedQuestion = await getLocalData('assistant_question');

        setContext({
          url: storedUrl,
          question: storedQuestion
        });

        let currentUrl: string | null = storedUrl || null;

        if (typeof window !== 'undefined' && window.chrome?.tabs) {
          const [tab] = await new Promise<chrome.tabs.Tab[]>((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, resolve);
          });
          currentUrl = tab?.url || storedUrl;
        }

        if (currentUrl) {
          const apps = await getAllApplications();
          const match = apps.find((app) => app.job_url === currentUrl);

          if (match) {
            setMatchedJob(match);
            setState('ready');
          } else {
            setState('no_match');
          }
        } else {
          setState('no_match');
        }
      } catch (error) {
        console.error('Error loading context:', error);
        setErrorMessage('Failed to load application data');
        setState('error');
      }
    }

    loadContext();
  }, []);

  // Listen for NEW_ASSISTANT_SELECTION messages
  useEffect(() => {
    if (typeof window === 'undefined' || !window.chrome?.runtime) return;

    const listener = (message: { action: string; success?: boolean; error?: string }) => {
      if (message.action === 'NEW_ASSISTANT_SELECTION') {
        if (message.success) {
          window.location.reload();
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleRefreshContext = async () => {
    if (typeof window === 'undefined' || !window.chrome?.runtime) return;

    try {
      const result = await chrome.runtime.sendMessage({ action: 'NEW_ASSISTANT_SELECTION' });
      if (result?.success) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error refreshing context:', error);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !matchedJob) return;

    setState('generating');
    setErrorMessage(null);
    setAnswer(null);

    try {
      const jobDesc = context.question || matchedJob.job_url || '';
      const resumeHtml = await getMasterResume();

      if (!resumeHtml) {
        throw new Error('Master resume not found. Please upload your resume in settings.');
      }

      if (typeof window !== 'undefined' && window.chrome?.runtime) {
        const result = await chrome.runtime.sendMessage({
          action: 'ASSISTANT_QUERY',
          question: question.trim(),
          jobDescription: jobDesc,
          resumeHtml: resumeHtml
        });

        if (result.success) {
          setAnswer(result.answer);
          setState('success');
        } else {
          throw new Error(result.error || 'Failed to get answer');
        }
      } else {
        setAnswer('This feature requires the Chrome extension context.');
        setState('success');
      }
    } catch (error) {
      console.error('Error asking question:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to get answer');
      setState('error');
    }
  };

  const handleCopyAnswer = async () => {
    if (!answer) return;

    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleNewSelection = () => {
    if (typeof window !== 'undefined' && window.chrome?.runtime) {
      chrome.runtime.sendMessage({ action: 'NEW_ASSISTANT_SELECTION' });
    }
  };

  if (state === 'loading' || state === 'idle') {
    return (
      <div className="min-h-screen bg-cream p-4 flex items-center justify-center">
        <p className="text-steel text-sm">Loading...</p>
      </div>
    );
  }

  if (state === 'no_match') {
    return (
      <div className="min-h-screen bg-cream p-4">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">&#128269;</div>
          <h2 className="text-lg font-semibold text-ink mb-2">No Matching Application</h2>
          <p className="text-sm text-steel mb-6">
            We could not find a job application matching this page.
          </p>
          <p className="text-xs text-steel mb-6">
            Visit a job posting page, then right-click and select<br />
            <span className="font-medium text-ink">Answer with Job Foocus</span>
          </p>
          <Button variant="primary" onClick={handleRefreshContext}>
            Refresh
          </Button>
        </div>
        <div className="mt-8">
          <SunsetStripeBand />
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-cream p-4">
        <Card variant="cream" className="text-center py-6">
          <div className="text-2xl mb-2">&#9888;</div>
          <h2 className="text-base font-semibold text-ink mb-2">Error</h2>
          <p className="text-sm text-steel mb-4">{errorMessage}</p>
          <Button variant="primary" onClick={() => setState('ready')}>
            Try Again
          </Button>
        </Card>
        <div className="mt-4">
          <SunsetStripeBand />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="bg-cream-deeper border-b border-beige-deep px-4 py-3">
        <h1 className="text-sm font-semibold text-ink">Application Assistant</h1>
        {matchedJob && (
          <p className="text-xs text-steel mt-0.5 truncate">
            {matchedJob.company} - {matchedJob.job_title}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Question Input */}
        <div className="space-y-2">
          <label htmlFor="question" className="text-xs font-medium text-ink">
            Ask about this job:
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., How should I tailor my resume for this role?"
            className="w-full h-24 px-3 py-2 text-sm border border-hairline-strong rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary bg-canvas text-ink placeholder:text-steel"
            disabled={state === 'generating'}
          />
        </div>

        {/* Ask Button */}
        <Button
          variant="primary"
          className="w-full"
          disabled={!question.trim() || state === 'generating'}
          onClick={handleAskQuestion}
        >
          {state === 'generating' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Thinking...
            </span>
          ) : (
            'Ask Question'
          )}
        </Button>

        {/* Answer Display */}
        {state === 'success' && answer && (
          <Card variant="cream-soft" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-ink">Answer</h3>
              <Button
                variant="link"
                className="text-xs"
                onClick={handleCopyAnswer}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
              {answer}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1 text-xs"
            onClick={handleNewSelection}
          >
            New Selection
          </Button>
          {matchedJob && (
            <Button
              variant="secondary"
              className="flex-1 text-xs"
              onClick={() => {
                if (typeof window !== 'undefined' && window.chrome?.runtime) {
                  const url = chrome.runtime.getURL(`document/index.html?app=${matchedJob.category}/${matchedJob.folder}&doc=resume`);
                  chrome.tabs.create({ url });
                }
              }}
            >
              View Resume
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div>
        <SunsetStripeBand />
      </div>
    </div>
  );
}