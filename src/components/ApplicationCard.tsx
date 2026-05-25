'use client';

import React from 'react';
import Card from './design/Card';
import Badge from './design/Badge';
import Button from './design/Button';
import { StatusType } from '@/lib/design-system';

interface ApplicationCardProps {
  id: string;
  company: string;
  job_title: string;
  category: string;
  category_name: string;
  category_color: string;
  status: StatusType;
  date_applied?: string;
  needs_followup?: boolean;
  onMarkApplied?: (id: string) => void;
}

const ApplicationCard = ({
  id,
  company,
  job_title,
  category,
  category_name,
  category_color,
  status,
  date_applied,
  needs_followup,
  onMarkApplied,
}: ApplicationCardProps) => {
  const categoryBadgeStyle = {
    backgroundColor: category_color || '#888888',
    color: '#ffffff',
  };

  // Calculate days since applied
  const daysSinceApplied = date_applied
    ? Math.floor((Date.now() - new Date(date_applied).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleMarkApplied = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onMarkApplied) {
      onMarkApplied(id);
    }
  };

  return (
    <a href={`/application?app=${id}`} className="block">
      <Card variant="default" className="hover:shadow-[rgba(0,0,0,0.04)_0px_4px_12px] transition-shadow duration-200 cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-semibold leading-[24px] text-ink mb-1 truncate">
              {company}
            </h3>
            <p className="text-[14px] leading-[20px] text-steel truncate">
              {job_title}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Category Badge */}
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold leading-[16px]"
            style={categoryBadgeStyle}
          >
            {category_name}
          </span>

          {/* Status Badge */}
          <Badge status={status} />

          {/* Needs Follow-up Indicator */}
          {needs_followup && (
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold leading-[16px] bg-primary text-white">
              Needs Follow-up
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-hairline-soft">
          <div className="text-[12px] leading-[16px] text-steel font-mono">
            {date_applied && status !== 'prospect' && (
              <p>
                Applied: {new Date(date_applied).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {daysSinceApplied !== null && (
                  <span className="ml-2 text-muted">
                    ({daysSinceApplied}d ago)
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Quick Action */}
          {status === 'prospect' && onMarkApplied && (
            <Button
              variant="secondary"
              onClick={handleMarkApplied}
              className="text-[12px] py-1.5 px-3 min-h-[32px]"
            >
              Mark Applied
            </Button>
          )}
        </div>
      </Card>
    </Link>
  );
};

export default ApplicationCard;