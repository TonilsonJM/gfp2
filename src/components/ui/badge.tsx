import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'pro' | 'free' | 'entrada' | 'saida' | 'default';
}

const variantes = {
  pro: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  free: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  entrada: 'bg-verde-100 text-verde-700 dark:bg-verde-900/30 dark:text-verde-400',
  saida: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  default: 'bg-azul-100 text-azul-700 dark:bg-azul-900/30 dark:text-azul-400',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        variantes[variant],
        className
      )}
      {...props}
    />
  );
}
