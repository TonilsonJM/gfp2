'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({
  children,
  apenasAdmin = false,
}: {
  children: ReactNode;
  apenasAdmin?: boolean;
}) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    } else if (!loading && apenasAdmin && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [loading, user, isAdmin, apenasAdmin, router]);

  if (loading || !user || (apenasAdmin && !isAdmin)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-verde-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
