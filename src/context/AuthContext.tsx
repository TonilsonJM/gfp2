'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { Profile } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isPro: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, senha: string) => Promise<{ error: string | null }>;
  signUp: (
    nome: string,
    email: string,
    senha: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarPerfil = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as Profile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await carregarPerfil(user.id);
  }, [user, carregarPerfil]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        carregarPerfil(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          carregarPerfil(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [carregarPerfil]);

  const signIn = async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    return { error: error ? traduzirErro(error.message) : null };
  };

  const signUp = async (nome: string, email: string, senha: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });
    return { error: error ? traduzirErro(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const value: AuthContextValue = {
    session,
    user,
    profile,
    loading,
    isPro: profile?.plano === 'PRO',
    isAdmin: profile?.is_admin === true,
    refreshProfile,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

function traduzirErro(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha inválidos.';
  if (msg.includes('User already registered')) return 'Este e-mail já está registado.';
  if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
  return msg;
}
