import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import api from '../../services/api';
import { formatUGX } from '../../utils/currency';

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeDate = (value) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString();
};

const toDateInput = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const addMonthsToDateInput = (dateInput, months) => {
  const base = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(base.getTime())) return '';
  const next = new Date(base);
  next.setMonth(next.getMonth() + Math.max(1, safeNumber(months || 1)));
  return next.toISOString().slice(0, 10);
};

const calculateAssignmentAmount = ({ plan, months, userType }) => {
  const normalizedMonths = Math.max(1, safeNumber(months || 1));
  const normalizedUserType = String(userType || '').toLowerCase();
  const monthly = safeNumber(plan?.monthlyPrice);
  const annual = safeNumber(plan?.annualPrice);
  const oneOff = safeNumber(plan?.price || monthly);

  if (normalizedUserType.includes('property')) {
    return Math.round(oneOff * normalizedMonths);
  }

  if (annual > 0) {
    return Math.round((annual / 12) * normalizedMonths);
  }
  return Math.round(monthly * normalizedMonths);
};

const SuperAdminBilling = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [plans, setPlans] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [activeTab, setActiveTab] = useState('subscribed_users');
  const [filters, setFilters] = useState({
    search: '',
    userType: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [selectedRow, setSelectedRow] = useState(null);
  const [dialogForm, setDialogForm] = useState({
    planId: '',
    subscribedMonths: 1,
    startDate: '',
    expiryDate: '',
    amount: 0,
    billingCycle: 'monthly'
  });

  const tabs = [
    { key: 'subscribed_users', label: 'Subscribed Users' },
    { key: 'active_subscriptions', label: 'Active' },
    { key: 'expiring_soon', label: 'Expiring Soon' },
    { key: 'expired_subscriptions', label: 'Expired' },
    { key: 'past_due', label: 'Past Due / Pending' },
    { key: 'property_seekers', label: 'Property Seekers' },
    { key: 'per_view_billing', label: 'Per View Billing' },
    { key: 'pending_payments', label: 'Pending Payments' },
    { key: 'failed_payments', label: 'Failed Payments' }
  ];

  const loadRows = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/super-admin/billing/transactions', {
        params: {
          page,
          limit: 20,
          tab: activeTab,
          search: filters.search,
          userType: filters.userType,
          status: filters.status,
          startDate: filters.startDate,
          endDate: filters.endDate
        }
      });
      setRows(Array.isArray(response.data?.transactions) ? response.data.transactions : []);
      setPagination(response.data?.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load billing subscriptions');
      setRows([]);
      setPagination({ page: 1, pages: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await api.get('/super-admin/plans');
      setPlans(Array.isArray(response.data?.plans) ? response.data.plans : []);
    } catch {
      setPlans([]);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRows(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRows(1);
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summaryCards = useMemo(() => {
    const subscriptionRows = rows.filter((item) => ['Landlord Subscription', 'Premium Seeker Plan'].includes(item.paymentFor));
    const subscribedUsers = subscriptionRows.length;
    const activeCount = subscriptionRows.filter((item) => String(item.status).toLowerCase() === 'paid').length;
    const expiringSoon = subscriptionRows.filter((item) => safeNumber(item.remainingDays) >= 0 && safeNumber(item.remainingDays) <= 30).length;
    const expired = subscriptionRows.filter((item) => safeNumber(item.remainingDays) < 0).length;
    const pending = subscriptionRows.filter((item) => String(item.status).toLowerCase() === 'pending').length;
    const billed = subscriptionRows.reduce((sum, item) => sum + safeNumber(item.amount), 0);

    return [
      { label: 'Subscribed', value: subscribedUsers, tone: 'text-blue-700 bg-blue-50' },
      { label: 'Active', value: activeCount, tone: 'text-green-700 bg-green-50' },
      { label: 'Expiring', value: expiringSoon, tone: 'text-amber-700 bg-amber-50' },
      { label: 'Expired', value: expired, tone: 'text-rose-700 bg-rose-50' },
      { label: 'Pending', value: pending, tone: 'text-purple-700 bg-purple-50' },
      { label: 'Amount', value: formatUGX(billed), tone: 'text-cyan-700 bg-cyan-50' }
    ];
  }, [rows]);

  const exportCsv = () => {
    const headers = ['User', 'Email', 'Type', 'Plan', 'Months', 'Amount', 'Expiry Date', 'Remaining Time', 'Status'];
    const data = rows.map((item) => ([
      item.user || 'N/A',
      item.email || 'N/A',
      item.userType || 'N/A',
      item.plan || item.paymentFor || 'N/A',
      item.subscribedMonths || 0,
      formatUGX(item.amount || 0),
      safeDate(item.expiryDate),
      item.remainingTime || 'N/A',
      item.status || 'N/A'
    ]));
    const csv = [headers, ...data].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'subscription-billing-tracking.csv';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const openDetails = (row) => {
    const matchingPlan = plans.find((item) => String(item._id) === String(row.currentPlanId))
      || plans.find((item) => String(item.name || '').toLowerCase() === String(row.plan || '').toLowerCase());
    const planId = matchingPlan?._id || row.currentPlanId || '';
    const subscribedMonths = Math.max(1, safeNumber(row.subscribedMonths || 1));
    const startDate = toDateInput(row.startDate) || toDateInput(new Date());
    const amount = calculateAssignmentAmount({
      plan: matchingPlan,
      months: subscribedMonths,
      userType: row.userType
    }) || safeNumber(row.amount);
    const expiryDate = toDateInput(row.expiryDate) || addMonthsToDateInput(startDate, subscribedMonths);

    setSelectedRow(row);
    setDialogForm({
      planId,
      subscribedMonths,
      startDate,
      expiryDate,
      amount,
      billingCycle: String(row.billingCycle || 'monthly')
    });
  };

  const selectedPlan = useMemo(
    () => plans.find((item) => String(item._id) === String(dialogForm.planId)),
    [plans, dialogForm.planId]
  );

  useEffect(() => {
    if (!selectedRow) return;
    const months = Math.max(1, safeNumber(dialogForm.subscribedMonths || 1));
    const startDate = dialogForm.startDate || toDateInput(new Date());
    const expiryDate = addMonthsToDateInput(startDate, months);
    const amount = calculateAssignmentAmount({
      plan: selectedPlan,
      months,
      userType: selectedRow.userType
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDialogForm((current) => ({
      ...current,
      startDate,
      expiryDate,
      amount
    }));
  }, [dialogForm.planId, dialogForm.startDate, dialogForm.subscribedMonths, selectedPlan, selectedRow]);

  const saveRenewOrChange = async () => {
    if (!selectedRow?.assignmentId) {
      setError('This record is from legacy transactions and cannot be changed here.');
      return;
    }
    try {
      setSaving(true);
      await api.put(`/super-admin/plan-assignments/${selectedRow.assignmentId}`, {
        planId: dialogForm.planId || selectedRow.currentPlanId,
        subscribedMonths: Math.max(1, safeNumber(dialogForm.subscribedMonths || 1)),
        startDate: dialogForm.startDate || null,
        expiryDate: dialogForm.expiryDate || null,
        amount: safeNumber(dialogForm.amount || 0),
        billingCycle: dialogForm.billingCycle || 'monthly',
        status: 'active'
      });
      setSelectedRow(null);
      await loadRows(pagination.page || 1);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to renew or change subscription');
    } finally {
      setSaving(false);
    }
  };

  const updateTransactionStatus = async (nextStatus) => {
    if (!selectedRow?.transactionId) return;
    try {
      setSaving(true);
      await api.put(`/super-admin/billing/transactions/${selectedRow.transactionId}/status`, { status: nextStatus });
      setSelectedRow(null);
      await loadRows(pagination.page || 1);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update transaction status');
    } finally {
      setSaving(false);
    }
  };

  const filteredDialogPlans = useMemo(() => {
    if (!selectedRow) return [];
    const isPropertySeeker = String(selectedRow.userType || '').toLowerCase().includes('property');
    return plans.filter((item) => (
      isPropertySeeker
        ? String(item.planType || '').toLowerCase() === 'property_seeker'
        : String(item.planType || '').toLowerCase() !== 'property_seeker'
    ));
  }, [plans, selectedRow]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
          <p className="mt-1 text-sm text-slate-500">Track subscribed users with profile, plan, and expiry details. Use view to renew or change plan.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:shadow-md">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button onClick={() => loadRows(pagination.page || 1)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{card.value || 0}</p>
            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${card.tone}`}>Live</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-slate-50 text-slate-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={filters.search} onChange={(event) => setFilters((state) => ({ ...state, search: event.target.value }))} placeholder="Search user, email, plan..." className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm" />
          </div>
          <select value={filters.userType} onChange={(event) => setFilters((state) => ({ ...state, userType: event.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
            <option value="">User Type</option>
            <option value="landlord">Landlord</option>
            <option value="property_seeker">Property Seeker</option>
          </select>
          <select value={filters.status} onChange={(event) => setFilters((state) => ({ ...state, status: event.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
            <option value="">Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input type="date" value={filters.startDate} onChange={(event) => setFilters((state) => ({ ...state, startDate: event.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
          <input type="date" value={filters.endDate} onChange={(event) => setFilters((state) => ({ ...state, endDate: event.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => loadRows(1)} className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white">Filter</button>
          <button onClick={() => setFilters({ search: '', userType: '', status: '', startDate: '', endDate: '' })} className="h-10 rounded-xl border border-slate-200 px-4 text-sm text-slate-700">Clear</button>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-600">
              <th className="px-4 py-3">Profile</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">User Type</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Loading subscription billing records...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No billing records found for this view.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-b-0 odd:bg-white even:bg-slate-50/40 hover:bg-slate-50">
                <td className="px-4 py-3">
                  {row.profilePhoto ? (
                    <img src={row.profilePhoto} alt={row.user || 'User'} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                      {String(row.user || 'U').trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{row.user || 'N/A'}</p>
                  <p className="text-xs text-slate-500">{row.email || 'N/A'}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">{row.userType || 'N/A'}</td>
                <td className="px-4 py-3 text-slate-700">{row.plan || row.paymentFor || 'N/A'}</td>
                <td className="px-4 py-3 text-slate-700">
                  <p className="font-medium text-slate-900">{formatUGX(row.totalAmount || row.amount || 0)}</p>
                  {row.selectedViews ? <p className="text-xs text-slate-500">{row.selectedViews} views</p> : null}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${String(row.status).toLowerCase() === 'paid' ? 'bg-emerald-50 text-emerald-700' : String(row.status).toLowerCase() === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{row.status || 'pending'}</span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-slate-700">{safeDate(row.date || row.expiryDate)}</p>
                  <p className="text-xs text-slate-500">{row.remainingTime || row.paymentMethod || 'N/A'}</p>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openDetails(row)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Showing page {pagination.page || 1} of {pagination.pages || 1} ({pagination.total || 0} records)</p>
        <div className="flex gap-2">
          <button onClick={() => loadRows(Math.max(1, (pagination.page || 1) - 1))} disabled={(pagination.page || 1) <= 1} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">Previous</button>
          <button onClick={() => loadRows(Math.min(pagination.pages || 1, (pagination.page || 1) + 1))} disabled={(pagination.page || 1) >= (pagination.pages || 1)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">Next</button>
        </div>
      </div>

      {selectedRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {selectedRow.profilePhoto ? (
                  <img src={selectedRow.profilePhoto} alt={selectedRow.user || 'User'} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                    {String(selectedRow.user || 'U').trim().charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{selectedRow.user || 'Subscription Details'}</h2>
                  <p className="mt-1 text-sm text-slate-500">{selectedRow.email || 'N/A'} - {selectedRow.userType || 'N/A'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedRow(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600">Close</button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                Current / New Plan
                <select
                  value={dialogForm.planId}
                  onChange={(event) => setDialogForm((state) => ({ ...state, planId: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                >
                  <option value="">Select plan</option>
                  {filteredDialogPlans.map((plan) => (
                    <option key={plan._id} value={plan._id}>{plan.name || 'N/A'}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Number of Months
                <input type="number" min={1} value={dialogForm.subscribedMonths} onChange={(event) => setDialogForm((state) => ({ ...state, subscribedMonths: Math.max(1, safeNumber(event.target.value || 1)) }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label className="text-sm text-slate-600">
                Start Date
                <input type="date" value={dialogForm.startDate} onChange={(event) => setDialogForm((state) => ({ ...state, startDate: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label className="text-sm text-slate-600">
                Auto Expiry Date
                <input type="date" value={dialogForm.expiryDate} readOnly className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700" />
              </label>
              <label className="text-sm text-slate-600">
                Auto Amount
                <input type="number" value={dialogForm.amount} readOnly className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700" />
              </label>
              <label className="text-sm text-slate-600">
                Status
                <div className="mt-1 h-10 rounded-lg border border-slate-200 bg-slate-100 px-3 flex items-center text-sm text-slate-700">{selectedRow.status || 'N/A'}</div>
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <p><span className="font-medium text-slate-700">Transaction:</span> {selectedRow.transactionId || 'N/A'}</p>
              <p><span className="font-medium text-slate-700">Current Plan:</span> {selectedRow.plan || selectedRow.paymentFor || 'N/A'}</p>
              <p><span className="font-medium text-slate-700">Amount:</span> {formatUGX(selectedRow.totalAmount || selectedRow.amount || 0)}</p>
              <p><span className="font-medium text-slate-700">Selected Views:</span> {selectedRow.selectedViews || 0}</p>
              <p><span className="font-medium text-slate-700">Payment Method:</span> {selectedRow.paymentMethod || 'N/A'}</p>
              <p><span className="font-medium text-slate-700">Status:</span> {selectedRow.status || 'pending'}</p>
              <p><span className="font-medium text-slate-700">Remaining Time:</span> {selectedRow.remainingTime || 'N/A'}</p>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button onClick={() => setSelectedRow(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Close</button>
              {selectedRow.source === 'billing_transaction' && String(selectedRow.status || '').toLowerCase() === 'pending' ? (
                <>
                  <button onClick={() => updateTransactionStatus('failed')} disabled={saving} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 disabled:opacity-50">Mark Failed</button>
                  <button onClick={() => updateTransactionStatus('paid')} disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving...' : 'Mark Paid'}</button>
                </>
              ) : null}
              <button onClick={saveRenewOrChange} disabled={saving || !selectedRow.assignmentId} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 disabled:opacity-50">Change Plan</button>
              <button onClick={saveRenewOrChange} disabled={saving || !selectedRow.assignmentId} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {saving ? 'Saving...' : 'Renew Subscription'}
              </button>
            </div>
            {!selectedRow.assignmentId ? (
              <p className="mt-2 text-xs text-amber-700">Legacy record detected. Renew/change is enabled only for assignment-tracked subscriptions.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SuperAdminBilling;
