import { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      suppressHydrationWarning
      className={cn(
        'w-full rounded-sm border border-white/15 bg-black/65 px-3 py-2 font-mono text-sm text-[var(--text)] outline-none placeholder:text-[#666] placeholder:uppercase placeholder:tracking-[0.16em] transition-all duration-75 focus:border-[var(--accent)] focus:shadow-[0_0_10px_rgba(0,255,65,0.3)]',
        className
      )}
      {...props}
    />
  );
}
