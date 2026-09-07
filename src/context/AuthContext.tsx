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
  signIn: (identificador: string, senha: string) => Promise<{ error: string | null }>;
  signUp: (
    nome: string,
    username: string,
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
    // Liga convites de carteiras partilhadas pendentes para este e-mail
    await supabase.rpc('aceitar_convites_pendentes');
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

  // Aceita e-mail OU nome de utilizador. Se não tiver "@", resolve o
  // e-mail correspondente ao username antes de autenticar.
  const signIn = async (identificador: string, senha: string) => {
    let email = identificador.trim();

    if (!email.includes('@')) {
      const { data: emailEncontrado, error: erroBusca } = await supabase.rpc(
        'obter_email_por_username',
        { p_username: email.toLowerCase() }
      );
      if (erroBusca || !emailEncontrado) {
        return { error: 'Utilizador não encontrado.' };
      }
      email = emailEncontrado as string;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    return { error: error ? traduzirErro(error.message) : null };
  };

  const signUp = async (nome: string, username: string, email: string, senha: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, username: username.toLowerCase() } },
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
  if (msg.includes('Invalid login credentials')) return 'E-mail/utilizador ou senha inválidos.';
  if (msg.includes('User already registered')) return 'Este e-mail já está registado.';
  if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
  if (msg.includes('profiles_username_key') || msg.includes('duplicate') && msg.includes('username')) {
    return 'Este nome de utilizador já está em uso.';
  }
  if (msg.includes('profiles_username_format')) {
    return 'Nome de utilizador inválido: use só minúsculas, números e "_" (3 a 20 caracteres).';
  }
  return msg;
}
