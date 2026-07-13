'use client';

import {
  Area,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface TrajectoryPoint {
  name: string;
  user: number;
  ref: number;
  band: [number, number];
}

// Trajetória do usuário vs. banda de referência ±15 pontos (§6.2).
export default function TrajectoryChart({ data }: { data: TrajectoryPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'band') return null;
              const label = name === 'user' ? 'Você' : 'Referência';
              return [`${value}%`, label];
            }}
          />
          <Legend
            formatter={(value) =>
              value === 'user' ? 'Você' : value === 'ref' ? 'Referência calibrada' : 'Banda ±15'
            }
          />
          <Area
            dataKey="band"
            stroke="none"
            fill="#10b981"
            fillOpacity={0.12}
            legendType="none"
            activeDot={false}
          />
          <Line
            dataKey="ref"
            stroke="#10b981"
            strokeDasharray="5 4"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line dataKey="user" stroke="#18181b" strokeWidth={2.5} dot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
