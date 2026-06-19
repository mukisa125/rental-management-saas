import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  LineChart,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
  XCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../../services/api';
import { formatUGX } from '../../utils/currency';

const compact = new Intl.NumberFormat('en-US');

const statusColors = {
  active: '#18bf6b',
  trial: '#3b82f6',
  pastDue: '#f5b640',
  expired: '#ff5b5f',
  cancelled: '#94a3b8',
};

const planColors = ['#2f7df6', '#14b8a6', '#f59e0b', '#7c3aed', '#ef4444'];

const formatTrend = (value = 0) => {
  const number = Number(value) || 0;
  return `${number > 0 ? '+' : ''}${number.toFixed(1)}%`;
};

const formatDate = (value) => {
  if (!value) return 'Today';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
};

const timeAgo = (value) => {
  if (!value) return 'Just now';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const Card = ({ children, className = '' }) => (
  <section className={`rounded-[10px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] ${className}`}>
    {children}
  </section>
);

const TrendPill = ({ value = 0, danger = false }) => {
  const isDown = danger || Number(value) < 0;
  const Icon = isDown ? TrendingDown : TrendingUp;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
      isDown ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
    }`}>
      <Icon className="h-3.5 w-3.5" />
      {formatTrend(value)}
    </span>
  );
};

const MetricCard = ({ label, value, icon: Icon, trend, tone = 'blue', danger = false }) => {
  const tones = {
    blue: 'from-blue-50 text-blue-600 ring-blue-100',
    purple: 'from-violet-50 text-violet-600 ring-violet-100',
    teal: 'from-teal-50 text-teal-600 ring-teal-100',
    green: 'from-emerald-50 text-emerald-600 ring-emerald-100',
    red: 'from-red-50 text-red-500 ring-red-100',
  };

  return (
    <Card className={`p-4 sm:p-5 ${danger ? 'border-red-200 bg-red-50/30' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br ${tones[tone]} ring-1`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold tracking-normal text-slate-950">{value}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
        <TrendPill value={trend} danger={danger} />
        <span>{label === 'Annual Revenue' ? 'vs last year' : 'vs last month'}</span>
      </div>
    </Card>
  );
};

const PanelHeader = ({ title, actionLabel, children }) => (
  <div className="mb-4 flex items-start justify-between gap-3">
    <div>
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
      {children}
    </div>
    {actionLabel && (
      <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
        {actionLabel}
      </button>
    )}
  </div>
);

const DonutChart = ({ data, centerLabel, colors }) => (
  <div className="relative h-44 w-full">
    <ResponsiveContainer>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius="58%" outerRadius="78%" paddingAngle={2} stroke="none">
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={colors[index] || entry.color || '#2563eb'} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      <span className="text-2xl font-black text-slate-950">{compact.format(centerLabel)}</span>
      <span className="text-xs font-semibold text-slate-500">Total</span>
    </div>
  </div>
);

const EmptyPanel = ({ label }) => (
  <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm font-semibold text-slate-400">
    {label}
  </div>
);

const SuperAdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/super-admin/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const kpis = dashboardData?.kpis || {};
  const charts = dashboardData?.charts || {};
  const activities = dashboardData?.activities || [];
  const transactions = dashboardData?.transactions || [];
  const systems = dashboardData?.systems || [];
  const plans = dashboardData?.plans || [];

  const statusData = useMemo(() => (
    Object.entries(charts.subscriptionsByStatus || {})
      .filter(([, value]) => Number(value) > 0)
      .map(([name, value]) => ({ name, value, color: statusColors[name] || '#64748b' }))
  ), [charts.subscriptionsByStatus]);

  const totalSubscriptions = statusData.reduce((sum, item) => sum + item.value, 0);
  const revenueSeries = charts.revenue || [];
  const planData = plans.map((plan) => ({ name: plan.name, value: plan.subscriptions, percentage: plan.percentage }));
  const totalPlanSubscriptions = planData.reduce((sum, item) => sum + item.value, 0);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Dashboard could not load</h2>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
          </div>
          <button onClick={fetchDashboard} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Customers" value={compact.format(kpis.totalCustomers || 0)} icon={Users} trend={kpis.customersTrend} />
        <MetricCard label="Total Properties" value={compact.format(kpis.totalProperties || 0)} icon={Building2} trend={kpis.propertiesTrend} tone="purple" />
        <MetricCard label="Total Units" value={compact.format(kpis.totalUnits || 0)} icon={ShieldCheck} trend={kpis.unitsTrend} />
        <MetricCard label="Total Tenants" value={compact.format(kpis.totalTenants || 0)} icon={UserPlus} trend={kpis.tenantsTrend} tone="teal" />
        <MetricCard label="Active Subscriptions" value={compact.format(kpis.activeSubscriptions || 0)} icon={CheckCircle2} trend={kpis.activeSubscriptionsTrend} tone="green" />
        <MetricCard label="Expired Subscriptions" value={compact.format(kpis.expiredSubscriptions || 0)} icon={XCircle} trend={kpis.expiredSubscriptionsTrend} tone="red" danger />
        <MetricCard label="Monthly Revenue" value={formatUGX(kpis.monthlyRevenue || 0)} icon={CreditCard} trend={kpis.monthlyRevenueTrend} />
        <MetricCard label="Annual Revenue" value={formatUGX(kpis.annualRevenue || 0)} icon={LineChart} trend={kpis.annualRevenueTrend} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_1.1fr_0.72fr]">
        <Card className="p-5">
          <PanelHeader title="Subscriptions by Status" actionLabel="This Month" />
          <div className="grid gap-5 sm:grid-cols-[0.9fr_1fr]">
            {statusData.length ? (
              <DonutChart data={statusData} centerLabel={totalSubscriptions} colors={statusData.map((item) => item.color)} />
            ) : (
              <EmptyPanel label="No subscription status data" />
            )}
            <div className="flex flex-col justify-center gap-3">
              {statusData.map((item) => (
                <div key={item.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold capitalize text-slate-600">{item.name.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="font-bold text-slate-800">
                    {compact.format(item.value)} <span className="font-semibold text-slate-400">({totalSubscriptions ? ((item.value / totalSubscriptions) * 100).toFixed(1) : 0}%)</span>
                  </span>
                </div>
              ))}
              <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                {formatTrend(kpis.activeSubscriptionsTrend)} more active subscriptions than last month
              </div>
            </div>
          </div>
          <a href="/super-admin/subscriptions" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-600">
            View all subscriptions <ArrowRight className="h-4 w-4" />
          </a>
        </Card>

        <Card className="p-5">
          <PanelHeader title="Revenue Overview" actionLabel="This Year">
            <p className="mt-4 text-xs font-semibold text-slate-500">Total Revenue</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-2xl font-black text-slate-950">{formatUGX(kpis.annualRevenue || 0)}</span>
              <TrendPill value={kpis.annualRevenueTrend} />
            </div>
          </PanelHeader>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={revenueSeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `UGX ${value / 1000}K`} width={58} />
                <Tooltip formatter={(value) => formatUGX(value)} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fill="url(#revenueFill)" dot={{ r: 3, fill: '#fff', stroke: '#2563eb', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <a href="/super-admin/reports" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-blue-600">
            View full report <ArrowRight className="h-4 w-4" />
          </a>
        </Card>

        <Card className="p-5">
          <PanelHeader title="System Health" />
          <div className="divide-y divide-slate-100">
            {systems.map((system) => {
              const healthy = system.status === 'healthy' || system.status === 'operational';
              return (
                <div key={system.name} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={`h-5 w-5 ${healthy ? 'text-emerald-500' : 'text-amber-500'}`} />
                    <span className="text-sm font-bold text-slate-700">{system.name}</span>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${healthy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {healthy ? 'Operational' : 'Warning'}
                  </span>
                </div>
              );
            })}
          </div>
          <a href="/super-admin/system-monitor" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-600">
            View system monitor <ArrowRight className="h-4 w-4" />
          </a>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.68fr_1fr]">
        <Card className="p-5">
          <PanelHeader title="Subscription Plan Summary" />
          <div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
            {planData.length ? (
              <DonutChart data={planData} centerLabel={totalPlanSubscriptions} colors={planColors} />
            ) : (
              <EmptyPanel label="No plan data" />
            )}
            <div className="space-y-3">
              {planData.map((plan, index) => (
                <div key={plan.name} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: planColors[index % planColors.length] }} />
                      <span className="truncate font-bold text-slate-700">{plan.name}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${plan.percentage}%`, backgroundColor: planColors[index % planColors.length] }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{compact.format(plan.value)}</div>
                    <div className="text-xs font-semibold text-slate-400">{plan.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <a href="/super-admin/subscriptions" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-600">
            Manage plans <ArrowRight className="h-4 w-4" />
          </a>
        </Card>

        <Card className="p-5">
          <PanelHeader title="Recent Activity" />
          <div className="space-y-4">
            {activities.length ? activities.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-bold text-slate-800">{item.title}</p>
                    <span className="shrink-0 text-xs font-semibold text-slate-400">{timeAgo(item.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">{item.subtitle}</p>
                </div>
              </div>
            )) : <EmptyPanel label="No recent activity" />}
          </div>
          <a href="/super-admin/activity-logs" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600">
            View all activities <ArrowRight className="h-4 w-4" />
          </a>
        </Card>

        <Card className="overflow-hidden">
          <div className="p-5 pb-3">
            <PanelHeader title="Latest Transactions" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead>
                <tr className="border-y border-slate-100 text-xs font-bold text-slate-500">
                  <th className="px-5 py-3">Invoice ID</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="text-slate-700">
                    <td className="px-5 py-3 font-bold text-slate-800">{transaction.invoiceId}</td>
                    <td className="px-5 py-3 font-semibold">{transaction.customer}</td>
                    <td className="px-5 py-3 font-bold">{formatUGX(transaction.amount || 0)}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                        transaction.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {transaction.status === 'completed' ? 'Paid' : transaction.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-500">{formatDate(transaction.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!transactions.length && <div className="px-5 pb-5"><EmptyPanel label="No transactions yet" /></div>}
          </div>
          <div className="px-5 pb-5 pt-2">
            <a href="/super-admin/subscriptions" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600">
              View all transactions <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
