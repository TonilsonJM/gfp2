'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Target,
  User,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from './ThemeToggle';

const links = [
  { href: '/dashboard', label: 'Dashboard', icone: LayoutDashboard },
  { href: '/carteiras', label: 'Carteiras', icone: Wallet },
  { href: '/transacoes', label: 'Transações', icone: ArrowLeftRight },
  { href: '/metas', label: 'Metas', icone: Target },
  { href: '/perfil', label: 'Perfil', icone: User },
];

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);

  if (!user) return null;

  const sair = async () => {
    await signOut();
    router.replace('/login');
  };

  const itens = isAdmin
    ? [...links, { href: '/admin', label: 'Admin', icone: ShieldCheck }]
    : links;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <span className="rounded-lg bg-gradient-to-br from-verde-500 to-azul-500 px-2 py-1 text-white text-sm">
            GFP
          </span>
          <span className="hidden sm:inline text-gray-800 dark:text-gray-100">
            Gestão Financeira Pessoal
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {itens.map(({ href, label, icone: Icone }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === href
                  ? 'bg-verde-50 text-verde-700 dark:bg-verde-900/30 dark:text-verde-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <Icone size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={sair}
            className="hidden md:flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <LogOut size={16} />
            Sair
          </button>
          <button
            className="md:hidden rounded-lg p-2 text-gray-600 dark:text-gray-300"
            onClick={() => setMenuAberto((v) => !v)}
          >
            {menuAberto ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuAberto && (
        <nav className="md:hidden flex flex-col gap-1 border-t border-gray-200 p-3 dark:border-gray-800">
          {itens.map(({ href, label, icone: Icone }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuAberto(false)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                pathname === href
                  ? 'bg-verde-50 text-verde-700 dark:bg-verde-900/30 dark:text-verde-400'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <Icone size={16} />
              {label}
            </Link>
          ))}
          <button
            onClick={sair}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500"
          >
            <LogOut size={16} />
            Sair
          </button>
        </nav>
      )}
    </header>
  );
}
