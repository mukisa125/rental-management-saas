import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const asNumber = (value) => Number(value) || 0;

const defaultSeries = [
  { key: 'expected', name: 'Expected', color: '#60a5fa' },
  { key: 'collected', name: 'Collected', color: '#16a34a' }
];

export default function RentCollectionChart({
  data,
  mode = 'bar',
  title = 'Chart Overview',
  subtitle = '',
  xKey = 'month',
  series = defaultSeries,
  compactNumber = true
}) {
  const rows = Array.isArray(data) ? data : [];
  const safeSeries = Array.isArray(series) && series.length ? series : defaultSeries;
  const yFormatter = compactNumber
    ? (value) => `${Math.round(asNumber(value) / 1000000)}M`
    : (value) => asNumber(value);
  const tipFormatter = (value) => `UGX ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(asNumber(value))}`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      <div className="mt-3 h-[280px] min-w-0 md:h-[320px]">
        {rows.length ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            {mode === 'line' ? (
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={yFormatter} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tipFormatter} />
                <Legend />
                {safeSeries.map((item) => (
                  <Line
                    key={item.key}
                    type="monotone"
                    dataKey={item.key}
                    name={item.name}
                    stroke={item.color}
                    strokeWidth={2.2}
                    dot={false}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={yFormatter} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tipFormatter} />
                <Legend />
                {safeSeries.map((item) => (
                  <Bar key={item.key} dataKey={item.key} name={item.name} fill={item.color} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-500">
            No chart data available for selected filters.
          </div>
        )}
      </div>
    </section>
  );
}
