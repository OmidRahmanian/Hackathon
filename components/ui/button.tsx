'use client';

import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ className, variant = 'primary', ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-75 disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' &&
          'border-[var(--accent)] bg-[var(--accent)] text-black shadow-[0_0_10px_rgba(0,255,65,0.3)] hover:bg-white hover:text-black',
        variant === 'secondary' &&
          'border-white/20 bg-black/70 text-[var(--text)] hover:bg-white hover:text-black',
        variant === 'ghost' &&
          'border-white/20 bg-transparent text-[var(--text-soft)] hover:bg-white hover:text-black',
        className
      )}
      {...props}
    />
  );
}
