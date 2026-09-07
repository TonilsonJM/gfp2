'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Target,
  User,
  ShieldCheck,
  LogOut,
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

  if (!user) return null;

  const sair = async () => {
    await signOut();
    router.replace('/login');
  };

  const itens = isAdmin
    ? [...links, { href: '/admin', label: 'Admin', icone: ShieldCheck }]
    : links;

  return (
    <header
      className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <span className="rounded-lg bg-gradient-to-br from-verde-500 to-azul-500 px-2 py-1 text-white text-sm">
            FJM
          </span>
          <span className="hidden sm:inline text-gray-800 dark:text-gray-100">
            Fin JM
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
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
