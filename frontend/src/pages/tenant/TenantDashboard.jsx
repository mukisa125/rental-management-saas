import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarDays, CircleDollarSign, FileText, Home, ReceiptText, Wrench, Zap } from 'lucide-react';
import { tenantPortalAPI } from '../../services/api';
import {
  dateLabel,
  daysUntil,
  EmptyTenantState,
  FieldRow,
  formatUGX,
  methodLabel,
  PageHeader,
  QuickActionCard,
  safeNumber,
  safeText,
  TenantErrorState,
  TenantLoadingState,
  TenantPanel,
  TenantStatCard,
  TenantStatusBadge
} from './TenantPortalUI';

const activityIcon = {
  payment: CircleDollarSign,
  maintenance: Wrench,
  document: FileText,
  notice: Bell
};

export default function TenantDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const response = await tenantPortalAPI.getDashboard();
        if (!cancelled) {
          setSummary(response.data || {});
          setError('');
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError?.response?.data?.message || 'Unable to load tenant dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const dueInDays = daysUntil(summary?.nextDueDate);
  const propertyName = safeText(summary?.property?.name || summary?.propertyName, 'Not linked');
  const unitNumber = safeText(summary?.unit?.unitNumber || summary?.unitNumber, 'Not assigned');
  const monthlyRent = safeNumber(summary?.monthlyRent || summary?.currentRent);
  const ownerName = safeText(summary?.owner?.name || summary?.ownerName, 'Not assigned');
  const ownerCompany = safeText(summary?.owner?.companyName || summary?.ownerCompanyName, 'RentProLink');
  const ownerEmail = safeText(summary?.owner?.email || summary?.ownerEmail, 'Not provided');
  const ownerPhone = safeText(summary?.owner?.phone || summary?.ownerPhone, 'Not provided');
  const recentActivity = Array.isArray(summary?.recentActivity) ? summary.recentActivity : [];

  const cards = useMemo(() => [
    {
      icon: CircleDollarSign,
      label: 'Monthly Rent',
      value: formatUGX(monthlyRent),
      note: 'View payment details',
      tone: 'blue'
    },
    {
      icon: CalendarDays,
      label: 'Next Due Date',
      value: dateLabel(summary?.nextDueDate),
      note: dueInDays > 0 ? `In ${dueInDays} days` : 'Due now',
      tone: dueInDays > 7 ? 'green' : dueInDays > 0 ? 'amber' : 'red'
    },
    {
      icon: CircleDollarSign,
      label: 'Outstanding Balance',
      value: formatUGX(summary?.outstandingBalance),
      note: safeNumber(summary?.outstandingBalance) > 0 ? 'Payment attention needed' : 'All payments up to date',
      tone: safeNumber(summary?.outstandingBalance) > 0 ? 'red' : 'green'
    },
    {
      icon: Wrench,
      label: 'Open Maintenance Requests',
      value: safeNumber(summary?.openMaintenanceRequests || summary?.activeMaintenanceRequests),
      note: 'View requests',
      tone: 'amber'
    }
  ], [dueInDays, monthlyRent, summary]);

  if (loading) return <TenantLoadingState message="Loading tenant dashboard..." />;
  if (error) return <TenantErrorState message={error} />;
  if (!summary) return <EmptyTenantState title="Tenant profile missing" description="Your tenant profile is not linked yet. Please contact your landlord." />;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader title="Tenant Portal" subtitle="Manage your rental payments, documents, notices, and maintenance requests." />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <TenantStatCard key={card.label} {...card} />)}
      </section>

      <TenantPanel
        title="Quick Actions"
        action={<p className="hidden text-sm font-medium text-slate-500 md:block">Shortcuts to manage your tenancy</p>}
      >
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <QuickActionCard icon={CircleDollarSign} title="Make Payment" subtitle="Pay rent and other charges" to="/tenant/payments" />
          <QuickActionCard icon={Wrench} title="Submit Request" subtitle="Report maintenance issue" to="/tenant/maintenance" />
          <QuickActionCard icon={ReceiptText} title="View Lease" subtitle="View your lease agreement" to="/tenant/my-property" />
          <QuickActionCard icon={FileText} title="Documents" subtitle="View your documents" to="/tenant/documents" />
        </div>
      </TenantPanel>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr_1.15fr]">
        <TenantPanel
          title="Lease Information"
          action={<Link to="/tenant/my-property" className="rounded-md border border-slate-200 px-4 py-2 text-xs font-black text-blue-600 hover:bg-blue-50">View Lease</Link>}
        >
          <dl className="px-5 py-3">
            <FieldRow label="Property" value={`${propertyName}, Unit ${unitNumber}`} />
            <FieldRow label="Lease Start Date" value={dateLabel(summary?.leaseStartDate)} />
            <FieldRow label="Lease End Date" value={dateLabel(summary?.leaseEndDate)} />
            <FieldRow label="Lease Expires In" value={`${safeNumber(summary?.daysRemainingOnLease)} days`} valueClassName={safeNumber(summary?.daysRemainingOnLease) > 30 ? 'text-emerald-600' : 'text-amber-600'} />
            <FieldRow label="Rent Amount" value={`${formatUGX(monthlyRent)} / month`} />
            <FieldRow label="Payment Day" value={safeText(summary?.paymentDay, 'N/A')} />
          </dl>
        </TenantPanel>

        <TenantPanel title="Landlord / Self Owner">
          <dl className="px-5 py-3">
            <FieldRow label="Name" value={ownerName} />
            <FieldRow label="Company" value={ownerCompany} />
            <FieldRow label="Email" value={ownerEmail} />
            <FieldRow label="Phone Number" value={ownerPhone} />
          </dl>
        </TenantPanel>

        <TenantPanel
          title="Payment Status"
          action={<Link to="/tenant/payments" className="rounded-md border border-slate-200 px-4 py-2 text-xs font-black text-blue-600 hover:bg-blue-50">View Payments</Link>}
        >
          <dl className="px-5 py-3">
            <FieldRow label="Total Paid" value={formatUGX(summary?.totalPaid)} valueClassName="text-emerald-600" />
            <FieldRow label="Outstanding Balance" value={formatUGX(summary?.outstandingBalance)} valueClassName={safeNumber(summary?.outstandingBalance) ? 'text-rose-600' : 'text-emerald-600'} />
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3">
              <dt className="text-sm font-semibold text-slate-500">Status</dt>
              <dd><TenantStatusBadge status={summary?.paymentStatus || 'up_to_date'} /></dd>
            </div>
            <FieldRow label="Last Payment" value={dateLabel(summary?.lastPayment?.paidDate || summary?.lastPayment?.paymentDate || summary?.lastPayment?.createdAt)} />
            <FieldRow label="Payment Method" value={methodLabel(summary?.paymentMethod)} />
            <FieldRow label="Next Payment Due" value={dateLabel(summary?.nextDueDate)} />
          </dl>
        </TenantPanel>

        <TenantPanel
          title="Recent Activity"
          className="xl:col-span-3"
          action={<Link to="/tenant/notices" className="rounded-md border border-slate-200 px-4 py-2 text-xs font-black text-blue-600 hover:bg-blue-50">View All</Link>}
        >
          <div className="grid gap-3 p-5 md:grid-cols-2 2xl:grid-cols-3">
            {recentActivity.length ? recentActivity.map((activity, index) => {
              const Icon = activityIcon[activity.type] || Zap;
              return (
                <div key={`${activity.title}-${index}`} className="flex min-h-24 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900">{safeText(activity.title)}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500">{safeText(activity.description)}</p>
                  </div>
                  <time className="shrink-0 text-right text-xs font-semibold text-slate-400">{dateLabel(activity.date)}</time>
                </div>
              );
            }) : <EmptyTenantState title="No activity yet" description="Tenant activity will appear here." />}
          </div>
        </TenantPanel>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-600">
            <Bell className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-black text-slate-950">Rent Reminder</p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              Your next rent payment of <strong>{formatUGX(monthlyRent)}</strong> is due on <strong>{dateLabel(summary?.nextDueDate)}</strong>.
            </p>
          </div>
        </div>
        <Link to="/tenant/payments" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700">Make Payment</Link>
      </section>
    </div>
  );
}
