'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { tema, alternarTema } = useTheme();
  return (
    <button
      onClick={alternarTema}
      aria-label="Alternar tema"
      className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition"
    >
      {tema === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
