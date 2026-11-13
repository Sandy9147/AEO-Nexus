import * as React from 'react';
import { cn } from '../lib/utils';

export interface NotificationProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  onDismiss?: () => void;
}

export function Notification({
  className,
  variant = 'info',
  title,
  children,
  onDismiss,
  ...props
}: NotificationProps) {
  const variants = {
    info: 'bg-[#EAF0FF] border-[#3563F6]/30 text-[#1E293B]',
    success: 'bg-emerald-50 border-emerald-300 text-emerald-950',
    warning: 'bg-amber-50 border-amber-300 text-amber-950',
    danger: 'bg-red-50 border-red-300 text-red-950',
  };

  const badgeColors = {
    info: 'text-[#3563F6]',
    success: 'text-[#16A36A]',
    warning: 'text-[#E59A27]',
    danger: 'text-red-600',
  };

  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 shadow-sm flex items-start gap-3',
        variants[variant],
        className,
      )}
      {...props}
    >
      <div className={cn('text-lg font-bold select-none', badgeColors[variant])}>
        {variant === 'info' && 'ℹ'}
        {variant === 'success' && '✓'}
        {variant === 'warning' && '⚠'}
        {variant === 'danger' && '✕'}
      </div>

      <div className="flex-1 text-sm">
        {title && <h5 className="font-semibold leading-none tracking-tight mb-1">{title}</h5>}
        <div className="text-sm opacity-90">{children}</div>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 text-sm font-semibold p-1 leading-none cursor-pointer"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
