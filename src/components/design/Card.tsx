'use client';

import React from 'react';

type CardVariant =
  | 'default'
  | 'elevated'
  | 'cream'
  | 'cream-soft'
  | 'feature-product'
  | 'glass'
  | 'outlined'
  | 'filled';

interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
}

const Card = ({
  variant = 'default',
  children,
  className = '',
}: CardProps) => {
  const variantClasses: Record<CardVariant, string> = {
    default: 'bg-canvas border border-hairline-soft',
    elevated:
      'bg-canvas border border-hairline-soft shadow-[rgba(0,0,0,0.04)_0px_4px_12px]',
    cream: 'bg-cream border border-beige-deep',
    'cream-soft': 'bg-surface-cream-soft',
    'feature-product':
      'bg-canvas border border-hairline-soft shadow-[rgba(0,0,0,0.04)_0px_4px_12px]',
    glass: 'bg-white/40 backdrop-blur-md border border-white/50 rounded-xl',
    outlined: 'bg-transparent border border-hairline-soft',
    filled: 'bg-surface border border-hairline-soft',
  };

  const classes = [
    'rounded-lg p-6',
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{children}</div>;
};

export default Card;