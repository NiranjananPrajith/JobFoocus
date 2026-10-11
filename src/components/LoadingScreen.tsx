interface LoadingScreenProps {
  /** Use a single honest loading message; no simulated progress stages. */
  messages: string[];
  fullScreen?: boolean;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Quiet indeterminate activity indicator shared by page and inline loading states. */
export default function LoadingScreen({ messages, fullScreen = false, compact = false, size = 'md', className = '' }: LoadingScreenProps) {
  return (
    <div className={`quiet-loading ${compact ? 'quiet-loading-compact' : ''} ${fullScreen ? 'quiet-loading-full' : ''} ${className}`} role="status" aria-live="polite" aria-atomic="true">
      <span className={`quiet-loading-mark quiet-loading-${size}`} aria-hidden="true"><span /><span /><span /></span>
      <p>{messages[0] || 'Loading your workspace…'}</p>
    </div>
  );
}
