'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalibrationBucket } from '@/lib/metrics';

export function BrierTimeline({
  data,
}: {
  data: { index: number; brier: number; date: string }[];
}) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="index" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v) => [Number(v).toFixed(3), 'Brier']}
            labelFormatter={(l) => `Tentativa ${l}`}
          />
          <Line dataKey="brier" stroke="#18181b" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Curva de calibração: confiança declarada × taxa real de acerto (§6.3).
export function CalibrationChart({ buckets }: { buckets: CalibrationBucket[] }) {
  const points = buckets
    .filter((b) => b.hitRate !== null)
    .map((b) => ({
      declared: b.declaredMid,
      real: Math.round((b.hitRate as number) * 100),
      attempts: b.attempts,
    }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            type="number"
            dataKey="declared"
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            label={{ value: 'Confiança declarada', position: 'insideBottom', offset: -2, fontSize: 11 }}
          />
          <YAxis type="number" dataKey="real" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v, name) => [`${v}%`, name === 'real' ? 'Acerto real' : name]}
          />
          {/* Diagonal = calibração perfeita */}
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: 100, y: 100 },
            ]}
            stroke="#a1a1aa"
            strokeDasharray="4 4"
          />
          <Scatter data={points} fill="#10b981" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
