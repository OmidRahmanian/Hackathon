import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'tech-card glass rounded-sm border border-white/10 px-5 pb-6 pt-8 md:px-6 md:pb-7 md:pt-9',
        className
      )}
      {...props}
    />
  );
}
