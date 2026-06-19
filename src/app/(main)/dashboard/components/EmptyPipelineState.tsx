'use client';

import Button from '@/components/design/Button';

interface EmptyPipelineStateProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onAddJob: () => void;
}

export default function EmptyPipelineState({ hasActiveFilters, onClearFilters, onAddJob }: EmptyPipelineStateProps) {
  return (
    <div className="text-center py-16 rounded-lg border border-dashed border-hairline bg-surface/50">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-muted">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <p className="text-[14px] font-medium text-ink mb-1">
        {hasActiveFilters ? 'No jobs match your filters' : 'No applications yet'}
      </p>
      <p className="text-[13px] text-steel mb-4">
        {hasActiveFilters
          ? 'Try adjusting your search or filters.'
          : 'Add your first job to start tracking your applications.'}
      </p>
      <div className="flex items-center justify-center gap-3">
        {hasActiveFilters && (
          <Button variant="outline" onClick={onClearFilters} className="text-[13px]">
            Clear filters
          </Button>
        )}
        <Button variant="primary" onClick={onAddJob} className="text-[13px]">
          Add Job
        </Button>
      </div>
    </div>
  );
}
