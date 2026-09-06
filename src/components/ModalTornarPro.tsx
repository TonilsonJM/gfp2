'use client';

import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Crown } from 'lucide-react';

export default function ModalTornarPro({
  aberto,
  aoFechar,
}: {
  aberto: boolean;
  aoFechar: () => void;
}) {
  return (
    <Dialog aberto={aberto} aoFechar={aoFechar} titulo="Tornar-se PRO">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/30">
          <Crown className="text-amber-500" size={28} />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Para ativar o Plano PRO mensal, contacte o ADM TonilsonJM no
          WhatsApp: <span className="font-semibold">244 972 749 764</span>
        </p>
        <a
          href="https://wa.me/244972749764"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full"
        >
          <Button variant="primary" className="w-full">
            <MessageCircle size={18} />
            Falar no WhatsApp
          </Button>
        </a>
        <p className="text-xs text-gray-400">
          Após a confirmação do pagamento, o administrador irá ativar o seu
          plano PRO manualmente no painel.
        </p>
      </div>
    </Dialog>
  );
}
