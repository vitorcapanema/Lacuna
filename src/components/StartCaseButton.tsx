'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function StartCaseButton({
  caseId,
  label = 'Iniciar caso',
}: {
  caseId: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Falha ao iniciar.');
      router.push(`/play/${data.attemptId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao iniciar.');
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={start}
        disabled={busy}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? 'Iniciando…' : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
