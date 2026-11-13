import * as React from 'react';
import { cn } from '../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'outline';
}

export function Badge({ className, variant = 'primary', ...props }: BadgeProps) {
  const variants = {
    primary: 'bg-[#EAF0FF] text-[#3563F6] border-transparent',
    secondary: 'bg-[#EEF0FF] text-[#6554E8] border-transparent',
    success: 'bg-emerald-50 text-[#16A36A] border-emerald-200',
    warning: 'bg-amber-50 text-[#E59A27] border-amber-200',
    outline: 'border-[#E2E8F0] text-[#64748B] bg-transparent',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
