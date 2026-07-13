'use client';

import { useState } from 'react';

export default function ImportForm() {
  const [json, setJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [imported, setImported] = useState<{ id: string; title: string }[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    setImported([]);

    let payload: unknown;
    try {
      payload = JSON.parse(json);
    } catch {
      setErrors(['JSON inválido — verifique a sintaxe.']);
      setBusy(false);
      return;
    }

    try {
      const res = await fetch('/api/cases/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? [data.error ?? 'Falha na importação.']);
      } else {
        setImported(data.imported);
        setJson('');
      }
    } catch {
      setErrors(['Falha de rede na importação.']);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={18}
        spellCheck={false}
        placeholder='[ { "title": "...", "area": "ombro", "type": "padrao", ... } ]'
        className="w-full rounded-md border border-zinc-300 bg-white p-3 font-mono text-xs focus:border-emerald-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy || !json.trim()}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? 'Validando e importando…' : 'Validar e importar'}
      </button>

      {errors.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-900">Erros de validação:</p>
          <ul className="mt-1 list-disc pl-5 text-xs text-red-800">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {imported.length > 0 && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-900">
            {imported.length} caso{imported.length > 1 ? 's' : ''} importado
            {imported.length > 1 ? 's' : ''}:
          </p>
          <ul className="mt-1 list-disc pl-5 text-xs text-emerald-800">
            {imported.map((c) => (
              <li key={c.id}>{c.title}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
