'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { urlBase64ToUint8Array, arrayBufferToBase64, caminhoComBasePath } from '@/lib/push';
import { Button } from '@/components/ui/button';
import { BellRing, BellOff } from 'lucide-react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export default function PushManager() {
  const { user } = useAuth();
  const [suportado, setSuportado] = useState(false);
  const [ativo, setAtivo] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const suporta =
      typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
    setSuportado(suporta);
    if (!suporta) return;

    navigator.serviceWorker.register(caminhoComBasePath('/sw.js')).then(async (registro) => {
      const subscricao = await registro.pushManager.getSubscription();
      setAtivo(!!subscricao);
    });
  }, []);

  const ativarNotificacoes = async () => {
    if (!user) return;
    setErro(null);

    if (!VAPID_PUBLIC_KEY) {
      setErro('Notificações push ainda não foram configuradas pelo administrador do site.');
      return;
    }

    setCarregando(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== 'granted') {
        setErro('Permissão de notificações negada.');
        setCarregando(false);
        return;
      }

      const registro = await navigator.serviceWorker.register(caminhoComBasePath('/sw.js'));
      const subscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const chaveP256dh = arrayBufferToBase64(subscricao.getKey('p256dh'));
      const chaveAuth = arrayBufferToBase64(subscricao.getKey('auth'));

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subscricao.endpoint,
          p256dh: chaveP256dh,
          auth_key: chaveAuth,
        },
        { onConflict: 'endpoint' }
      );

      if (error) {
        setErro(error.message);
      } else {
        setAtivo(true);
      }
    } catch (e: any) {
      setErro(e.message || 'Não foi possível ativar as notificações.');
    }
    setCarregando(false);
  };

  const desativarNotificacoes = async () => {
    setCarregando(true);
    const registro = await navigator.serviceWorker.getRegistration(caminhoComBasePath('/'));
    const subscricao = await registro?.pushManager.getSubscription();
    if (subscricao) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', subscricao.endpoint);
      await subscricao.unsubscribe();
    }
    setAtivo(false);
    setCarregando(false);
  };

  if (!suportado) {
    return (
      <p className="text-xs text-gray-400">
        O seu navegador não suporta notificações push.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={ativo ? 'outline' : 'secondary'}
        onClick={ativo ? desativarNotificacoes : ativarNotificacoes}
        disabled={carregando}
      >
        {ativo ? <BellOff size={16} /> : <BellRing size={16} />}
        {carregando ? 'A processar...' : ativo ? 'Desativar notificações' : 'Ativar notificações'}
      </Button>
      {erro && <p className="text-xs text-red-500">{erro}</p>}
    </div>
  );
}
