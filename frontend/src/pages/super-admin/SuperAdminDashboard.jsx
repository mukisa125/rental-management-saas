import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Home,
  Loader2,
  RefreshCw,
  UserSearch,
  Users
} from 'lucide-react';
import api from '../../services/api';
import { formatUGX } from '../../utils/currency';

const numberFormat = new Intl.NumberFormat('en-US');

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
};

const trendTone = (trend) => {
  const numericTrend = safeNumber(trend);
  if (numericTrend > 0) return 'positive';
  if (numericTrend < 0) return 'negative';
  return 'neutral';
};

const toneStyles = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  purple: 'bg-blue-50 text-blue-600 border-blue-100',
  cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  red: 'bg-rose-50 text-rose-600 border-rose-100',
  pink: 'bg-blue-50 text-blue-600 border-blue-100',
  teal: 'bg-emerald-50 text-emerald-600 border-emerald-100'
};

const trendStyles = {
  positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  negative: 'bg-rose-50 text-rose-700 border-rose-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200'
};

const SectionCard = ({ title, subtitle, viewAllLink, children, className = '' }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md ${className}`}>
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {viewAllLink ? (
        <a href={viewAllLink} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </div>
    {children}
  </section>
);

const SummaryCard = ({ icon: Icon, label, value, subtitle, trend, tone }) => {
  const trendType = trendTone(trend);
  const toneClass = toneStyles[tone] || toneStyles.blue;
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${trendStyles[trendType]}`}>
          {trendType === 'positive' ? '+' : trendType === 'negative' ? '-' : ''}
          {Math.abs(safeNumber(trend)).toFixed(1)}%
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </article>
  );
};

const HorizontalMetric = ({ label, value, percent, colorClass = 'bg-blue-500' }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="h-2 rounded-full bg-slate-100">
      <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }} />
    </div>
  </div>
);

const SuperAdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let mounted = true;
    const loadDashboard = async () => {
      try {
        if (mounted) {
          setLoading(true);
          setError('');
        }
        const response = await api.get('/super-admin/dashboard');
        if (mounted) {
          setDashboardData(response.data || {});
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    loadDashboard();
    return () => {
      mounted = false;
    };
  }, [refreshNonce]);

  const kpis = dashboardData?.kpis || {};
  const platformOverview = dashboardData?.platformOverview || {};
  const marketplaceActivity = dashboardData?.marketplaceActivity || {};
  const revenueBilling = dashboardData?.revenueBilling || {};
  const propertySeekerActivity = dashboardData?.propertySeekerActivity || {};
  const landlordsSummary = Array.isArray(dashboardData?.landlordsSummary) ? dashboardData.landlordsSummary : [];
  const landlordUnitBreakdown = dashboardData?.landlordUnitBreakdown || {};
  const transactions = Array.isArray(dashboardData?.transactions) ? dashboardData.transactions : [];
  const systems = Array.isArray(dashboardData?.systems) ? dashboardData.systems : [];
  const activities = Array.isArray(dashboardData?.activities) ? dashboardData.activities : [];

  const summaryCards = [
    { icon: Building2, label: 'Total Landlords', value: numberFormat.format(safeNumber(kpis.totalLandlords)), trend: kpis.landlordsTrend, subtitle: 'Registered landlord accounts', tone: 'blue' },
    { icon: Users, label: 'Total Tenants', value: numberFormat.format(safeNumber(kpis.totalTenants)), trend: kpis.tenantsTrend, subtitle: 'Platform tenant records', tone: 'purple' },
    { icon: UserSearch, label: 'Property Seekers', value: numberFormat.format(safeNumber(kpis.totalPropertySeekers)), trend: kpis.propertySeekersTrend, subtitle: 'Search users (not tenants)', tone: 'cyan' },
    { icon: Home, label: 'Total Properties', value: numberFormat.format(safeNumber(kpis.totalProperties)), trend: kpis.propertiesTrend, subtitle: 'Landlord-managed properties', tone: 'green' },
    { icon: Home, label: 'Total Units', value: numberFormat.format(safeNumber(kpis.totalUnits)), trend: kpis.unitsTrend, subtitle: 'All units across landlords', tone: 'teal' },
    { icon: Home, label: 'Vacant Units', value: numberFormat.format(safeNumber(kpis.vacantUnits)), trend: 0, subtitle: 'Available inventory', tone: 'amber' },
    { icon: FileText, label: 'Published Listings', value: numberFormat.format(safeNumber(kpis.publishedListings)), trend: 0, subtitle: 'Marketplace listings', tone: 'pink' },
    { icon: BarChart3, label: 'Listing Views', value: numberFormat.format(safeNumber(kpis.listingViews)), trend: 0, subtitle: 'Seeker listing views', tone: 'cyan' },
    { icon: BarChart3, label: 'Visit Bookings', value: numberFormat.format(safeNumber(kpis.visitBookings)), trend: 0, subtitle: 'Booked property visits', tone: 'teal' },
    { icon: CreditCard, label: 'Active Subscriptions', value: numberFormat.format(safeNumber(kpis.activeSubscriptions)), trend: kpis.activeSubscriptionsTrend, subtitle: 'Landlord subscriptions', tone: 'blue' },
    { icon: CreditCard, label: 'Monthly Revenue', value: formatUGX(safeNumber(kpis.monthlyRevenue)), trend: kpis.monthlyRevenueTrend, subtitle: 'Current monthly collections', tone: 'green' },
    { icon: AlertTriangle, label: 'Pending Payments', value: numberFormat.format(safeNumber(kpis.pendingPayments)), trend: 0, subtitle: 'Awaiting payment', tone: 'amber' },
    { icon: AlertTriangle, label: 'System Alerts', value: numberFormat.format(safeNumber(kpis.systemAlerts)), trend: 0, subtitle: 'Warnings requiring attention', tone: 'red' }
  ];

  const filteredTransactions = transactions.filter((item) => (
    transactionFilter === 'all' ? true : String(item.userType || '').toLowerCase() === transactionFilter
  ));

  const filteredActivities = activities.filter((item) => {
    if (activityFilter === 'all') return true;
    const source = `${item.title || ''} ${item.type || ''}`.toLowerCase();
    if (activityFilter === 'landlord') return source.includes('subscription') || source.includes('landlord');
    if (activityFilter === 'tenant') return source.includes('tenant');
    if (activityFilter === 'seeker') return source.includes('seeker') || source.includes('listing') || source.includes('visit');
    return true;
  });

  const healthTone = (statusValue) => {
    const status = String(statusValue || 'unknown').toLowerCase();
    if (status === 'operational' || status === 'healthy') return 'bg-emerald-50 text-emerald-700';
    if (status === 'warning') return 'bg-amber-50 text-amber-700';
    if (status === 'down') return 'bg-rose-50 text-rose-700';
    return 'bg-slate-100 text-slate-600';
  };

  const landlordOccupancyPercent = safeNumber(landlordUnitBreakdown.totalUnits) > 0
    ? (safeNumber(landlordUnitBreakdown.occupiedUnits) / safeNumber(landlordUnitBreakdown.totalUnits)) * 100
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 sa-fade-in">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setRefreshNonce((prev) => prev + 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Platform Overview" subtitle="Landlords, tenants, seekers, properties, and units growth">
          <div className="space-y-3">
            <HorizontalMetric label="Landlords Growth" value={`${safeNumber(platformOverview.landlordsGrowth).toFixed(1)}%`} percent={Math.min(Math.abs(safeNumber(platformOverview.landlordsGrowth)), 100)} colorClass="bg-blue-500" />
            <HorizontalMetric label="Tenants Growth" value={`${safeNumber(platformOverview.tenantsGrowth).toFixed(1)}%`} percent={Math.min(Math.abs(safeNumber(platformOverview.tenantsGrowth)), 100)} colorClass="bg-violet-500" />
            <HorizontalMetric label="Property Seekers Growth" value={`${safeNumber(platformOverview.propertySeekersGrowth).toFixed(1)}%`} percent={Math.min(Math.abs(safeNumber(platformOverview.propertySeekersGrowth)), 100)} colorClass="bg-cyan-500" />
            <HorizontalMetric label="Properties Growth" value={`${safeNumber(platformOverview.propertiesGrowth).toFixed(1)}%`} percent={Math.min(Math.abs(safeNumber(platformOverview.propertiesGrowth)), 100)} colorClass="bg-emerald-500" />
            <HorizontalMetric label="Units Growth" value={`${safeNumber(platformOverview.unitsGrowth).toFixed(1)}%`} percent={Math.min(Math.abs(safeNumber(platformOverview.unitsGrowth)), 100)} colorClass="bg-amber-500" />
          </div>
        </SectionCard>

        <SectionCard title="Marketplace Activity" subtitle="Listings, views, unlocks, reveals, and visits">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Published Listings</p><p className="mt-1 text-lg font-bold text-slate-900">{numberFormat.format(safeNumber(marketplaceActivity.publishedListings))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Unpublished Listings</p><p className="mt-1 text-lg font-bold text-slate-900">{numberFormat.format(safeNumber(marketplaceActivity.unpublishedListings))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Listing Views</p><p className="mt-1 text-lg font-bold text-slate-900">{numberFormat.format(safeNumber(marketplaceActivity.listingViews))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Detail Unlocks</p><p className="mt-1 text-lg font-bold text-slate-900">{numberFormat.format(safeNumber(marketplaceActivity.detailUnlocks))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Map Reveals</p><p className="mt-1 text-lg font-bold text-slate-900">{numberFormat.format(safeNumber(marketplaceActivity.mapReveals))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Visit Bookings</p><p className="mt-1 text-lg font-bold text-slate-900">{numberFormat.format(safeNumber(marketplaceActivity.visitBookings))}</p></div>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Revenue & Billing" subtitle="Subscriptions, seeker spend, pending and failed payments" viewAllLink="/super-admin/billing">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Landlord Subscription Revenue</p><p className="mt-1 text-base font-bold text-slate-900">{formatUGX(safeNumber(revenueBilling.landlordSubscriptionRevenue))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Seeker View/Unlock Revenue</p><p className="mt-1 text-base font-bold text-slate-900">{formatUGX(safeNumber(revenueBilling.propertySeekerViewUnlockRevenue))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Seeker Visit Revenue</p><p className="mt-1 text-base font-bold text-slate-900">{formatUGX(safeNumber(revenueBilling.propertySeekerVisitBookingRevenue))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Total Platform Revenue</p><p className="mt-1 text-base font-bold text-slate-900">{formatUGX(safeNumber(revenueBilling.totalPlatformRevenue))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Pending Payments</p><p className="mt-1 text-base font-bold text-slate-900">{numberFormat.format(safeNumber(revenueBilling.pendingPayments))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Failed Payments</p><p className="mt-1 text-base font-bold text-slate-900">{numberFormat.format(safeNumber(revenueBilling.failedPayments))}</p></div>
          </div>
        </SectionCard>

        <SectionCard title="Property Seeker Activity" subtitle="Seeker totals, spending, views, and visits" viewAllLink="/super-admin/property-seekers">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Total Seekers</p><p className="mt-1 text-base font-bold text-slate-900">{numberFormat.format(safeNumber(propertySeekerActivity.totalSeekers))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Active This Month</p><p className="mt-1 text-base font-bold text-slate-900">{numberFormat.format(safeNumber(propertySeekerActivity.activeSeekersThisMonth))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Total Paid Views</p><p className="mt-1 text-base font-bold text-slate-900">{numberFormat.format(safeNumber(propertySeekerActivity.totalPaidViews))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Total Booked Visits</p><p className="mt-1 text-base font-bold text-slate-900">{numberFormat.format(safeNumber(propertySeekerActivity.totalBookedVisits))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Total Spent by Seekers</p><p className="mt-1 text-base font-bold text-slate-900">{formatUGX(safeNumber(propertySeekerActivity.totalAmountSpentBySeekers))}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Average Views per Seeker</p><p className="mt-1 text-base font-bold text-slate-900">{safeNumber(propertySeekerActivity.averageViewsPerSeeker).toFixed(2)}</p></div>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Landlord Unit Performance" subtitle="Occupied and vacant unit distribution by landlord">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600">Occupied vs Vacant</p>
                <p className="text-xs text-slate-500">{safeNumber(landlordOccupancyPercent).toFixed(1)}% occupancy</p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(landlordOccupancyPercent, 100))}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                <p>Occupied: <span className="font-bold text-slate-900">{numberFormat.format(safeNumber(landlordUnitBreakdown.occupiedUnits))}</span></p>
                <p>Vacant: <span className="font-bold text-slate-900">{numberFormat.format(safeNumber(landlordUnitBreakdown.vacantUnits))}</span></p>
                <p>Total: <span className="font-bold text-slate-900">{numberFormat.format(safeNumber(landlordUnitBreakdown.totalUnits))}</span></p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[700px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="py-2 px-3">Landlord</th>
                    <th className="py-2 px-3">Properties</th>
                    <th className="py-2 px-3">Total Units</th>
                    <th className="py-2 px-3">Occupied</th>
                    <th className="py-2 px-3">Vacant</th>
                    <th className="py-2 px-3">Tenants</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {landlordsSummary.length === 0 ? (
                    <tr><td colSpan={6} className="py-3 px-3 text-slate-500">No records found</td></tr>
                  ) : landlordsSummary.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3">{row.landlordName || 'N/A'}</td>
                      <td className="py-2 px-3">{numberFormat.format(safeNumber(row.properties))}</td>
                      <td className="py-2 px-3">{numberFormat.format(safeNumber(row.totalUnits))}</td>
                      <td className="py-2 px-3">{numberFormat.format(safeNumber(row.occupiedUnits))}</td>
                      <td className="py-2 px-3">{numberFormat.format(safeNumber(row.vacantUnits))}</td>
                      <td className="py-2 px-3">{numberFormat.format(safeNumber(row.tenants))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="System Health" subtitle="Service uptime and incident watch" viewAllLink="/super-admin/system-monitor">
          <div className="space-y-2">
            {systems.length === 0 ? (
              <p className="text-sm text-slate-500">No records found</p>
            ) : systems.map((system) => (
              <div key={system.name} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">{system.name}</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${healthTone(system.status)}`}>
                  {String(system.status || 'unknown')}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Latest Transactions" subtitle="Recent subscription and payment events" viewAllLink="/super-admin/billing">
        <div className="mb-3 flex flex-wrap gap-2">
          {['all', 'landlord', 'tenant', 'property seeker'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTransactionFilter(type)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${transactionFilter === type ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="py-2 px-3">Transaction ID</th>
                <th className="py-2 px-3">User</th>
                <th className="py-2 px-3">User Type</th>
                <th className="py-2 px-3">Payment For</th>
                <th className="py-2 px-3">Amount</th>
                <th className="py-2 px-3">Payment Method</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr><td colSpan={8} className="py-3 px-3 text-slate-500">No records found</td></tr>
              ) : filteredTransactions.map((item) => (
                <tr key={item.id || item.transactionId} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-semibold text-slate-800">{item.transactionId || 'N/A'}</td>
                  <td className="py-2 px-3">{item.user || 'N/A'}</td>
                  <td className="py-2 px-3">{item.userType || 'N/A'}</td>
                  <td className="py-2 px-3">{item.paymentFor || 'N/A'}</td>
                  <td className="py-2 px-3">{formatUGX(safeNumber(item.amount))}</td>
                  <td className="py-2 px-3">{item.paymentMethod || 'N/A'}</td>
                  <td className="py-2 px-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${healthTone(item.status)}`}>{String(item.status || 'N/A')}</span>
                  </td>
                  <td className="py-2 px-3">{safeDate(item.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Recent Activity" subtitle="Platform actions and events timeline" viewAllLink="/super-admin/activity-logs">
        <div className="mb-3 flex flex-wrap gap-2">
          {['all', 'landlord', 'tenant', 'seeker'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setActivityFilter(type)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${activityFilter === type ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {filteredActivities.length === 0 ? (
            <p className="text-sm text-slate-500">No records found</p>
          ) : filteredActivities.map((activity, index) => (
            <div key={activity.id || `${activity.type}-${index}`} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                index % 4 === 0 ? 'bg-blue-100 text-blue-700' : index % 4 === 1 ? 'bg-emerald-100 text-emerald-700' : index % 4 === 2 ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'
              }`}>
                {String(activity.type || 'A').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{activity.title || 'Platform activity'}</p>
                <p className="mt-0.5 text-xs text-slate-500">{activity.subtitle || 'N/A'} - {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

export default SuperAdminDashboard;
