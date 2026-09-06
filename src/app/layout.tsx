import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'GFP - Gestão Financeira Pessoal',
  description: 'Controle as suas finanças pessoais e em grupo, de forma simples.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
