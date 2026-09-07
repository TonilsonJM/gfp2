'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Target,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const linksBase = [
  { href: '/dashboard', label: 'Início', icone: LayoutDashboard },
  { href: '/carteiras', label: 'Carteiras', icone: Wallet },
  { href: '/transacoes', label: 'Transações', icone: ArrowLeftRight },
  { href: '/metas', label: 'Metas', icone: Target },
  { href: '/perfil', label: 'Perfil', icone: User },
];

export default function BottomNav() {
  const { user, isAdmin } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const itens = isAdmin
    ? [...linksBase, { href: '/admin', label: 'Admin', icone: ShieldCheck }]
    : linksBase;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white/95 backdrop-blur md:hidden dark:border-gray-800 dark:bg-gray-950/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {itens.map(({ href, label, icone: Icone }) => {
        const ativo = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium"
          >
            <Icone
              size={20}
              className={ativo ? 'text-verde-600 dark:text-verde-400' : 'text-gray-400 dark:text-gray-500'}
            />
            <span
              className={ativo ? 'text-verde-600 dark:text-verde-400' : 'text-gray-400 dark:text-gray-500'}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
