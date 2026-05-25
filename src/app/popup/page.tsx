'use client';

import { useEffect, useState } from 'react';
import { getAllApplications, type EnrichedApplication } from '@/lib/storage-adapter';
import Button from '@/components/design/Button';
import Card from '@/components/design/Card';

type GenerateStatus = 'idle' | 'scraping' | 'analyzing' | 'generating' | 'success' | 'error';

export default function PopupPage() {
  const [activeJob, setActiveJob] = useState<EnrichedApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDocButtons, setShowDocButtons] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState<GenerateStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      // Check for Chrome extension API availability
      if (typeof window === 'undefined' || !window.chrome || !window.chrome.tabs) {
        setIsLoading(false);
        return;
      }

      try {
        // Get current active tab URL
        const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });

        const currentUrl = tabs[0]?.url;

        if (currentUrl) {
          // Fetch all applications and find matching job_url
          const apps = await getAllApplications();
          const match = apps.find((app) => app.job_url === currentUrl);
          setActiveJob(match || null);
        }
      } catch (error) {
        console.error('Error initializing popup:', error);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  const handleOpenDashboard = () => {
    if (typeof window !== 'undefined' && window.chrome?.runtime) {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    }
  };

  const handleViewResume = () => {
    if (activeJob && typeof window !== 'undefined' && window.chrome?.runtime) {
      const url = chrome.runtime.getURL(`document/index.html?app=${activeJob.category}/${activeJob.folder}&doc=resume`);
      chrome.tabs.create({ url });
    }
  };

  const handleViewCoverLetter = () => {
    if (activeJob && typeof window !== 'undefined' && window.chrome?.runtime) {
      const url = chrome.runtime.getURL(`document/index.html?app=${activeJob.category}/${activeJob.folder}&doc=cover_letter`);
      chrome.tabs.create({ url });
    }
  };

  const handleAddJob = async () => {
    if (!chrome?.tabs) {
      setErrorMessage('Chrome API not available');
      setGenerateStatus('error');
      return;
    }

    setIsGenerating(true);
    setGenerateStatus('scraping');
    setErrorMessage(null);

    try {
      // 1. Get current active tab
      const [tab] = await new Promise<chrome.tabs.Tab[]>((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
      });

      if (!tab?.id || !tab.url) {
        throw new Error('No active tab found');
      }

      // 2. Clip page via content script
      setGenerateStatus('analyzing');
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'clipPage' });

      if (!response || !response.text) {
        throw new Error('Failed to scrape page content');
      }

      // 3. Send to background worker for LLM processing
      setGenerateStatus('generating');
      const result = await chrome.runtime.sendMessage({
        action: 'GENERATE_APPLICATION',
        jobDescription: response.text,
        tabUrl: tab.url
      });

      if (result.success) {
        setActiveJob(result.job);
        setShowDocButtons(true);
        setGenerateStatus('success');
        // Refresh the activeJob match if this URL now has a job
        const apps = await getAllApplications();
        const match = apps.find((app) => app.job_url === tab.url);
        if (match) {
          setActiveJob(match);
        }
      } else {
        throw new Error(result.error || 'Failed to generate application');
      }
    } catch (error) {
      console.error('Error generating application:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate application');
      setGenerateStatus('error');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-[350px] p-4">
        <p className="text-steel text-sm">Loading...</p>
      </div>
    );
  }

  const getStatusText = () => {
    switch (generateStatus) {
      case 'scraping': return 'Scraping page...';
      case 'analyzing': return 'Analyzing job description...';
      case 'generating': return 'Generating application...';
      case 'success': return 'Application created!';
      case 'error': return errorMessage || 'Error occurred';
      default: return '';
    }
  };

  return (
    <div className="w-[350px] p-4 space-y-3">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-semibold text-ink">Job Foocus</h1>
        {activeJob && (
          <p className="text-xs text-steel mt-1 truncate">{activeJob.company}</p>
        )}
      </div>

      {/* Status Message */}
      {(isGenerating || generateStatus === 'success' || generateStatus === 'error') && (
        <div className={`text-center text-sm p-2 rounded ${generateStatus === 'success' ? 'bg-green-100 text-green-700' : generateStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-steel'}`}>
          {isGenerating && (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {getStatusText()}
            </span>
          )}
          {!isGenerating && getStatusText()}
        </div>
      )}

      {/* Button 1: Add Job */}
      <Button
        variant="primary"
        className="w-full"
        disabled={isGenerating}
        onClick={handleAddJob}
      >
        {isGenerating ? 'Processing...' : '+ Add Job'}
      </Button>

      {/* Button 2: Download Docs */}
      <div className="space-y-2">
        <Button
          variant="cream"
          className="w-full"
          disabled={!activeJob || isGenerating}
          onClick={() => setShowDocButtons(!showDocButtons)}
        >
          Download Docs
        </Button>

        {showDocButtons && activeJob && (
          <div className="flex gap-2 pl-2">
            <Button variant="secondary" className="flex-1 text-sm" onClick={handleViewResume}>
              Resume
            </Button>
            <Button variant="secondary" className="flex-1 text-sm" onClick={handleViewCoverLetter}>
              Cover Letter
            </Button>
          </div>
        )}
      </div>

      {/* Button 3: Application Assistant */}
      <Button variant="cream" className="w-full" disabled={isGenerating} onClick={() => alert('Application Assistant: Coming in Phase 4')}>
        Application Assistant
      </Button>

      {/* Button 4: Dashboard */}
      <Button variant="dark" className="w-full" disabled={isGenerating} onClick={handleOpenDashboard}>
        Open Dashboard
      </Button>
    </div>
  );
}