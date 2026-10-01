import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatFrDate } from '../../utils/dates';
import { formatCents } from '../../utils/money';
import type { HistoryPoint } from './PriceHistoryDialog';

const COLORS = ['#2563eb', '#d97706', '#059669', '#9333ea', '#db2777', '#0891b2'];

/** Courbes de prix par magasin ; chargé à la demande pour alléger l'application. */
export default function PriceHistoryChart({
  points,
  unit,
}: {
  points: HistoryPoint[];
  unit: string;
}) {
  const series = [...new Set(points.map((p) => p.series))];
  const byDate = new Map<string, Record<string, number | string>>();
  for (const p of points) {
    const row = byDate.get(p.date) ?? { date: p.date };
    row[p.series] = p.cents / 100;
    byDate.set(p.date, row);
  }
  const data = [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label={`Courbes du prix en euros par ${unit}, une par magasin`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatFrDate(d).slice(0, 5)}
            stroke="var(--ink-soft)"
            fontSize={12}
          />
          <YAxis
            stroke="var(--ink-soft)"
            fontSize={12}
            width={48}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => v.toFixed(2).replace('.', ',')}
          />
          <Tooltip
            formatter={(v) =>
              typeof v === 'number' ? `${formatCents(Math.round(v * 100))} / ${unit}` : String(v)
            }
            labelFormatter={(d) => formatFrDate(String(d))}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
            }}
          />
          <Legend />
          {series.map((s, i) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              name={s}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
