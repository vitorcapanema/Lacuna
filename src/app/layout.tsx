import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Banco de Casos Lacuna',
  description:
    'Treinador de raciocínio clínico para fisioterapeutas neuromusculoesqueléticos.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        {children}
      </body>
    </html>
  );
}
