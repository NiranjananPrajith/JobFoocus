'use client';

import React from 'react';
import { statusColors, statusLabels, StatusType } from '@/lib/design-system';

interface BadgeProps {
  status: StatusType;
  showLabel?: boolean;
  className?: string;
}

const Badge = ({ status, showLabel = true, className = '' }: BadgeProps) => {
  const backgroundColor = statusColors[status] || '#888888';
  const label = statusLabels[status] || status;

  return (
    <span
      className={[
        'inline-flex items-center rounded-full',
        'px-2.5 py-1',
        'text-[13px] font-semibold leading-[1.40]',
        className,
      ].join(' ')}
      style={{
        backgroundColor,
        color: '#ffffff',
      }}
    >
      {showLabel && label}
    </span>
  );
};

export default Badge;