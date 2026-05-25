'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'cream' | 'dark' | 'secondary' | 'on-cream' | 'link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

const Button = ({
  variant = 'primary',
  children,
  className = '',
  ...props
}: ButtonProps) => {
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-on-primary hover:bg-primary-deep',
    cream: 'bg-cream text-ink border border-beige-deep hover:bg-cream-deeper',
    dark: 'bg-ink text-on-dark hover:bg-charcoal',
    secondary: 'bg-transparent text-ink border border-hairline-strong hover:bg-surface',
    'on-cream': 'bg-canvas text-ink border border-beige-deep hover:bg-cream-light',
    link: 'bg-transparent text-primary hover:underline p-0',
  };

  const classes = [
    'inline-flex items-center justify-center',
    'font-medium text-[14px] leading-[1.30]',
    'rounded-md px-5 py-2.5',
    'transition-colors duration-150',
    'focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
    variantClasses[variant],
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};

export default Button;