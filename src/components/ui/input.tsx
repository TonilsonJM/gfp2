import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-verde-500 focus:ring-2 focus:ring-verde-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-verde-900',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
