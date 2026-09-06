import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

const variantes = {
  primary: 'bg-verde-500 text-white hover:bg-verde-600',
  secondary: 'bg-azul-500 text-white hover:bg-azul-600',
  outline:
    'border border-gray-300 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
  ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
  destructive: 'bg-red-500 text-white hover:bg-red-600',
};

const tamanhos = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed',
          variantes[variant],
          tamanhos[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
