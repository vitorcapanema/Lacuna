import type { Metadata } from 'next';
import Simulador from '@/components/Simulador';

export const metadata: Metadata = {
  title: 'Simulador de raciocínio clínico — ONE Health & Performance',
};

// Acessível sem login (ver src/middleware.ts) para permitir teste imediato:
// basta ANTHROPIC_API_KEY no servidor — não requer Supabase.
export default function SimuladorPage() {
  return <Simulador />;
}
