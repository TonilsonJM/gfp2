'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo?: string;
  children: ReactNode;
}

export function Dialog({ aberto, aoFechar, titulo, children }: DialogProps) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={aoFechar}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          {titulo && (
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {titulo}
            </h2>
          )}
          <button
            onClick={aoFechar}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
