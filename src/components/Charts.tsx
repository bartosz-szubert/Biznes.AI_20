import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHANNELS } from '../domain/channels';
import type { ChannelId } from '../domain/types';
import { formatPLN, formatPct } from '../format';

/** Stałe kolory kanałów z palety – ten sam kanał ma zawsze ten sam kolor (dataviz: kolor wg encji). */
export const CHANNEL_COLOR: Record<ChannelId, string> = {
  social: 'var(--series-social)',
  www: 'var(--series-www)',
  radio: 'var(--series-radio)',
};

const tooltipStyle = {
  background: 'var(--surface-1)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
};

export interface DonutDatum {
  id: ChannelId;
  name: string;
  value: number;
  sharePct: number;
}

/** Podział budżetu – wykres pierścieniowy. Etykiety tekstowe są w legendzie i w tabeli. */
export function BudgetDonut({ data }: { data: DonutDatum[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="chart-box" role="img" aria-label={donutLabel(data)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={0}
            stroke="var(--surface-1)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.id} fill={CHANNEL_COLOR[d.id]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [
              `${formatPLN(Number(value))} (${formatPct(total ? (Number(value) / total) * 100 : 0)})`,
              String(name),
            ]}
          />
          <Legend verticalAlign="bottom" iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function donutLabel(data: DonutDatum[]): string {
  return (
    'Podział budżetu: ' +
    data.map((d) => `${d.name} ${formatPct(d.sharePct)}`).join(', ')
  );
}

export interface GroupedDatum {
  name: string;
  budget: number;
  revenue: number;
}

/** Budżet obok przychodu dla każdego kanału. Jedna oś wartości (PLN). */
export function BudgetRevenueBars({ data }: { data: GroupedDatum[] }) {
  return (
    <div className="chart-box" role="img" aria-label="Budżet i przychód według kanałów">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--gridline)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 13 }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            tickFormatter={(v: number) => compactPLN(v)}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatPLN(Number(value)), String(name)]} />
          <Legend verticalAlign="top" iconType="square" />
          <Bar dataKey="budget" name="Budżet" fill="var(--text-muted)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          <Bar dataKey="revenue" name="Przychód" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Skrót kwoty do osi: 0 / 250 tys. / 1,2 mln (bez spacji, żeby etykieta się nie zawijała). */
export function compactPLN(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString('pl-PL', { maximumFractionDigits: 1 })}mln`;
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}tys`;
  return String(Math.round(v));
}

export interface ScenarioBarDatum {
  name: string;
  value: number;
}

/** Słupki po jednej wartości dla każdego scenariusza (ROI lub zysk – każdy wykres ma własną oś). */
export function ScenarioBars({
  data,
  format,
  tickFormat,
  label,
  color,
}: {
  data: ScenarioBarDatum[];
  format: (v: number) => string;
  tickFormat: (v: number) => string;
  label: string;
  color: string;
}) {
  return (
    <div className="chart-box" role="img" aria-label={`${label}: ${data.map((d) => `${d.name} ${format(d.value)}`).join(', ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--gridline)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 13 }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
          <YAxis
            tickFormatter={(v: number) => tickFormat(v)}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => [format(Number(value)), label]} />
          <Bar dataKey="value" name={label} fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface StackedDatum {
  name: string;
  social: number;
  www: number;
  radio: number;
}

/** Struktura budżetu w scenariuszach (udziały %, każdy słupek sumuje się do 100). */
export function StructureStacked({ data }: { data: StackedDatum[] }) {
  const ids: ChannelId[] = ['social', 'www', 'radio'];
  return (
    <div className="chart-box" role="img" aria-label="Struktura budżetu w scenariuszach">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--gridline)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 13 }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatPct(Number(value)), CHANNELS[name as ChannelId]?.name ?? String(name)]} />
          <Legend verticalAlign="top" iconType="circle" formatter={(value: string) => CHANNELS[value as ChannelId]?.name ?? value} />
          {ids.map((id) => (
            <Bar
              key={id}
              dataKey={id}
              stackId="share"
              fill={CHANNEL_COLOR[id]}
              stroke="var(--surface-1)"
              strokeWidth={2}
              maxBarSize={48}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
