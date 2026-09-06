'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Tema = 'light' | 'dark';

interface ThemeContextValue {
  tema: Tema;
  alternarTema: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>('light');

  useEffect(() => {
    const guardado = (localStorage.getItem('gfp-tema') as Tema) || null;
    const preferido = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    const inicial = guardado || preferido;
    setTema(inicial);
    document.documentElement.classList.toggle('dark', inicial === 'dark');
  }, []);

  const alternarTema = () => {
    setTema((atual) => {
      const novo = atual === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', novo === 'dark');
      localStorage.setItem('gfp-tema', novo);
      return novo;
    });
  };

  return (
    <ThemeContext.Provider value={{ tema, alternarTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de <ThemeProvider>');
  return ctx;
}
