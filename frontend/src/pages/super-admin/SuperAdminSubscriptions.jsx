import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CreditCard,
  Crown,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserPlus,
  Users
} from 'lucide-react';
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

const calculateAssignmentAmount = ({ plan, billingCycle, subscribedMonths, userType }) => {
  const months = Math.max(1, safeNumber(subscribedMonths || 1));
  const cycle = String(billingCycle || 'monthly').toLowerCase();

  if (cycle === 'annual') {
    const annual = safeNumber(plan?.annualPrice);
    return annual > 0 ? Math.round((annual / 12) * months) : Math.round(safeNumber(plan?.monthlyPrice) * months);
  }

  if (['pay_per_use', 'credit_bundle'].includes(cycle) || userType === 'property_seeker') {
    return Math.round(safeNumber(plan?.price || plan?.monthlyPrice) * months);
  }

  return Math.round(safeNumber(plan?.monthlyPrice) * months);
};

const statusClass = (status) => {
  const key = String(status || '').toLowerCase();
  if (['active', 'paid'].includes(key)) return 'bg-green-50 text-green-700';
  if (['trial', 'pending'].includes(key)) return 'bg-amber-50 text-amber-700';
  if (['expired', 'failed', 'past_due'].includes(key)) return 'bg-rose-50 text-rose-700';
  return 'bg-slate-100 text-slate-700';
};

const SUMMARY_CARD_STYLES = [
  { icon: BadgeCheck, accent: 'bg-blue-50 text-blue-600' },
  { icon: Users, accent: 'bg-amber-50 text-amber-600' },
  { icon: Crown, accent: 'bg-blue-50 text-blue-600' },
  { icon: CreditCard, accent: 'bg-cyan-50 text-cyan-600' },
  { icon: SlidersHorizontal, accent: 'bg-rose-50 text-rose-600' },
  { icon: RefreshCw, accent: 'bg-emerald-50 text-emerald-600' }
];

const DEFAULT_PLAN_FORM = {
  id: '',
  selectedPlanTemplateId: '',
  planType: 'landlord',
  name: '',
  description: '',
  billingModel: 'monthly',
  monthlyPrice: 0,
  annualPrice: 0,
  price: 0,
  includedViews: 0,
  includedVisits: 0,
  maxProperties: '',
  maxUnits: '',
  maxTenants: '',
  maxDocuments: '',
  whatsAppAlertsLimit: '',
  propertyDisplayEnabled: true,
  validityDays: 30,
  featuresInput: '',
  status: 'active'
};

const DEFAULT_ASSIGN_FORM = {
  id: '',
  userType: 'landlord',
  userId: '',
  planId: '',
  subscribedMonths: 1,
  amount: 0,
  startDate: '',
  billingCycle: 'monthly',
  expiryDate: '',
  renewalDate: '',
  status: 'trial',
  notes: ''
};

const SuperAdminSubscriptions = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all_plans');
  const [search, setSearch] = useState('');
  const [plans, setPlans] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [landlords, setLandlords] = useState([]);
  const [propertySeekers, setPropertySeekers] = useState([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPlanPreview, setSelectedPlanPreview] = useState(null);
  const [planForm, setPlanForm] = useState(DEFAULT_PLAN_FORM);
  const [assignForm, setAssignForm] = useState(DEFAULT_ASSIGN_FORM);

  const loadPageData = async () => {
    try {
      setLoading(true);
      setError('');
      const [plansRes, assignmentsRes, landlordsRes, seekersRes] = await Promise.all([
        api.get('/super-admin/plans'),
        api.get('/super-admin/plan-assignments', { params: { page: 1, limit: 500 } }),
        api.get('/super-admin/landlords', { params: { page: 1, limit: 500 } }),
        api.get('/super-admin/property-seekers', { params: { page: 1, limit: 500 } })
      ]);

      setPlans(Array.isArray(plansRes.data?.plans) ? plansRes.data.plans : []);
      setAssignments(Array.isArray(assignmentsRes.data?.assignments) ? assignmentsRes.data.assignments : []);
      setLandlords(Array.isArray(landlordsRes.data?.landlords) ? landlordsRes.data.landlords : []);
      setPropertySeekers(Array.isArray(seekersRes.data?.propertySeekers) ? seekersRes.data.propertySeekers : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load subscriptions page');
      setPlans([]);
      setAssignments([]);
      setLandlords([]);
      setPropertySeekers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPageData();
  }, []);

  const summary = useMemo(() => {
    const activeSubscriptions = assignments.filter((item) => String(item.status).toLowerCase() === 'active').length;
    const trialSubscriptions = assignments.filter((item) => String(item.status).toLowerCase() === 'trial').length;
    const propertySeekerPlans = plans.filter((item) => String(item.planType).toLowerCase() === 'property_seeker').length;
    const landlordPlans = plans.filter((item) => String(item.planType).toLowerCase() !== 'property_seeker').length;
    const pastDue = assignments.filter((item) => String(item.status).toLowerCase() === 'past_due').length;
    const mrr = assignments
      .filter((item) => String(item.status).toLowerCase() === 'active')
      .reduce((sum, item) => sum + safeNumber(item.amount), 0);

    return { activeSubscriptions, trialSubscriptions, propertySeekerPlans, landlordPlans, pastDue, mrr };
  }, [assignments, plans]);

  const summaryCards = [
    { label: 'Active Subscriptions', value: summary.activeSubscriptions, subtitle: 'Currently active assignments', trend: '+8.4%' },
    { label: 'Trial Subscriptions', value: summary.trialSubscriptions, subtitle: 'Plans in trial period', trend: '+2.1%' },
    { label: 'Property Seeker Plans', value: summary.propertySeekerPlans, subtitle: 'Per-view, per-visit, bundles', trend: 'Neutral' },
    { label: 'Landlord Plans', value: summary.landlordPlans, subtitle: 'Starter, Pro, Business tiers', trend: '+1.7%' },
    { label: 'Past Due', value: summary.pastDue, subtitle: 'Requires manual follow-up', trend: '-3.4%' },
    { label: 'Total MRR', value: formatUGX(summary.mrr), subtitle: 'Manual assignments revenue baseline', trend: '+11.2%' }
  ];

  const filteredPlans = useMemo(() => {
    const term = search.trim().toLowerCase();
    const bySearch = plans.filter((plan) => {
      if (!term) return true;
      return [
        plan.name,
        plan.description,
        plan.planType,
        plan.billingModel,
        ...(Array.isArray(plan.features) ? plan.features : [])
      ].some((value) => String(value || '').toLowerCase().includes(term));
    });

    if (activeTab === 'all_plans') return bySearch;
    if (activeTab === 'landlord_plans') return bySearch.filter((item) => String(item.planType).toLowerCase() !== 'property_seeker');
    if (activeTab === 'property_seeker_plans') return bySearch.filter((item) => String(item.planType).toLowerCase() === 'property_seeker');
    return bySearch;
  }, [plans, search, activeTab]);

  const filteredAssignments = useMemo(() => {
    const term = search.trim().toLowerCase();
    const bySearch = assignments.filter((item) => {
      if (!term) return true;
      return [
        item.user,
        item.business,
        item.userType,
        item.assignedPlan,
        item.status,
        item.billingCycle
      ].some((value) => String(value || '').toLowerCase().includes(term));
    });

    if (activeTab === 'assigned_plans') return bySearch;
    if (activeTab === 'trial') return bySearch.filter((item) => String(item.status).toLowerCase() === 'trial');
    if (activeTab === 'expired') return bySearch.filter((item) => String(item.status).toLowerCase() === 'expired');
    if (activeTab === 'past_due') return bySearch.filter((item) => String(item.status).toLowerCase() === 'past_due');
    return bySearch;
  }, [assignments, search, activeTab]);

  const tabs = [
    { key: 'all_plans', label: 'All Plans' },
    { key: 'landlord_plans', label: 'Landlord Plans' },
    { key: 'property_seeker_plans', label: 'Property Seeker Plans' },
    { key: 'assigned_plans', label: 'Assigned Plans' },
    { key: 'trial', label: 'Trial' },
    { key: 'expired', label: 'Expired' },
    { key: 'past_due', label: 'Past Due' }
  ];

  const openCreatePlan = () => {
    setPlanForm(DEFAULT_PLAN_FORM);
    setShowPlanModal(true);
  };

  const openEditPlan = (plan) => {
    setPlanForm({
      id: plan?._id || '',
      selectedPlanTemplateId: plan?._id || '',
      planType: String(plan?.planType || 'landlord'),
      name: String(plan?.name || ''),
      description: String(plan?.description || ''),
      billingModel: String(plan?.billingModel || 'monthly'),
      monthlyPrice: safeNumber(plan?.monthlyPrice),
      annualPrice: safeNumber(plan?.annualPrice),
      price: safeNumber(plan?.price),
      includedViews: safeNumber(plan?.includedViews),
      includedVisits: safeNumber(plan?.includedVisits),
      maxProperties: plan?.maxProperties ?? '',
      maxUnits: plan?.maxUnits ?? '',
      maxTenants: plan?.maxTenants ?? '',
      maxDocuments: plan?.maxDocuments ?? '',
      whatsAppAlertsLimit: plan?.whatsAppAlertsLimit ?? '',
      propertyDisplayEnabled: plan?.propertyDisplayEnabled !== false,
      validityDays: safeNumber(plan?.validityDays || 30),
      featuresInput: (Array.isArray(plan?.features) ? plan.features : []).join(', '),
      status: plan?.isActive ? 'active' : 'inactive'
    });
    setShowPlanModal(true);
  };

  const openCreateAssignment = () => {
    setAssignForm(DEFAULT_ASSIGN_FORM);
    setShowAssignModal(true);
  };

  const openEditAssignment = (assignment) => {
    setAssignForm({
      id: assignment?.id || '',
      userType: String(assignment?.userType || 'Landlord').toLowerCase().includes('property') ? 'property_seeker' : 'landlord',
      userId: assignment?.userId || '',
      planId: plans.find((plan) => plan.name === assignment?.assignedPlan)?._id || '',
      subscribedMonths: Math.max(1, safeNumber(assignment?.subscribedMonths || 1)),
      amount: safeNumber(assignment?.amount || 0),
      startDate: toDateInput(assignment?.startDate),
      billingCycle: assignment?.billingCycle || 'monthly',
      expiryDate: toDateInput(assignment?.expiryDate),
      renewalDate: toDateInput(assignment?.renewalDate),
      status: String(assignment?.status || 'trial').toLowerCase(),
      notes: assignment?.notes || ''
    });
    setShowAssignModal(true);
  };

  const submitPlan = async () => {
    try {
      setSaving(true);
      const features = String(planForm.featuresInput || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const payload = {
        planType: planForm.planType,
        name: planForm.name,
        description: planForm.description,
        billingModel: planForm.billingModel,
        monthlyPrice: safeNumber(planForm.monthlyPrice),
        annualPrice: safeNumber(planForm.annualPrice),
        price: safeNumber(planForm.price),
        includedViews: safeNumber(planForm.includedViews),
        includedVisits: safeNumber(planForm.includedVisits),
        maxProperties: planForm.maxProperties === '' ? null : safeNumber(planForm.maxProperties),
        maxUnits: planForm.maxUnits === '' ? null : safeNumber(planForm.maxUnits),
        maxTenants: planForm.maxTenants === '' ? null : safeNumber(planForm.maxTenants),
        maxDocuments: planForm.maxDocuments === '' ? null : safeNumber(planForm.maxDocuments),
        whatsAppAlertsLimit: planForm.whatsAppAlertsLimit === '' ? null : safeNumber(planForm.whatsAppAlertsLimit),
        propertyDisplayEnabled: planForm.propertyDisplayEnabled,
        validityDays: safeNumber(planForm.validityDays || 30),
        features,
        status: planForm.status,
        isActive: planForm.status === 'active'
      };

      if (planForm.id) {
        await api.put(`/super-admin/plans/${planForm.id}`, payload);
      } else {
        await api.post('/super-admin/plans', payload);
      }

      setShowPlanModal(false);
      await loadPageData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const submitAssignment = async () => {
    try {
      setSaving(true);
      const payload = {
        userType: assignForm.userType,
        userId: assignForm.userId,
        planId: assignForm.planId,
        subscribedMonths: Math.max(1, safeNumber(assignForm.subscribedMonths || 1)),
        amount: safeNumber(assignForm.amount || 0),
        startDate: assignForm.startDate || null,
        billingCycle: assignForm.billingCycle,
        expiryDate: assignForm.expiryDate || null,
        renewalDate: assignForm.renewalDate || null,
        status: assignForm.status,
        notes: assignForm.notes
      };

      if (assignForm.id) {
        await api.put(`/super-admin/plan-assignments/${assignForm.id}`, payload);
      } else {
        await api.post('/super-admin/plan-assignments', payload);
      }

      setShowAssignModal(false);
      await loadPageData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  const cancelAssignment = async (assignmentId) => {
    try {
      setSaving(true);
      await api.delete(`/super-admin/plan-assignments/${assignmentId}`);
      await loadPageData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to cancel assignment');
    } finally {
      setSaving(false);
    }
  };

  const assignmentUsers = assignForm.userType === 'property_seeker' ? propertySeekers : landlords;
  const filteredAssignmentUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assignmentUsers;
    return assignmentUsers.filter((user) => (
      [user.fullName, user.landlordName, user.email, user.phoneNumber, user.phone, user.companyName]
        .some((value) => String(value || '').toLowerCase().includes(term))
    ));
  }, [assignmentUsers, search]);

  const assignablePlans = plans.filter((plan) => (
    assignForm.userType === 'property_seeker'
      ? String(plan.planType).toLowerCase() === 'property_seeker'
      : String(plan.planType).toLowerCase() !== 'property_seeker'
  ));

  const selectedAssignPlan = useMemo(
    () => assignablePlans.find((plan) => String(plan._id) === String(assignForm.planId)),
    [assignablePlans, assignForm.planId]
  );

  useEffect(() => {
    if (!showAssignModal) return;
    if (!assignForm.planId) return;
    const months = Math.max(1, safeNumber(assignForm.subscribedMonths || 1));
    const effectiveStart = assignForm.startDate || toDateInput(new Date());
    const autoExpiry = addMonthsToDateInput(effectiveStart, months);
    const autoAmount = calculateAssignmentAmount({
      plan: selectedAssignPlan,
      billingCycle: assignForm.billingCycle,
      subscribedMonths: months,
      userType: assignForm.userType
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAssignForm((current) => ({
      ...current,
      startDate: effectiveStart,
      expiryDate: autoExpiry,
      renewalDate: autoExpiry,
      amount: autoAmount
    }));
  }, [assignForm.billingCycle, assignForm.planId, assignForm.subscribedMonths, assignForm.startDate, assignForm.userType, selectedAssignPlan, showAssignModal]);

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
        <div className="flex flex-wrap gap-2">
          <button onClick={openCreateAssignment} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:shadow-md">
            <UserPlus className="h-4 w-4" />
            Assign Plan
          </button>
          <button onClick={openCreatePlan} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Create New Plan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card, index) => {
          const style = SUMMARY_CARD_STYLES[index % SUMMARY_CARD_STYLES.length];
          const Icon = style.icon;
          return (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${style.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(card.trend.startsWith('-') ? 'expired' : (card.trend === 'Neutral' ? 'neutral' : 'active'))}`}>
                  {card.trend}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{card.value || 0}</p>
              <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        Manual allocation is enabled now. Auto-billing and auto-renew will activate once Mobile Money gateway is integrated.
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search plans, assignments, users..."
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button onClick={loadPageData} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading subscriptions data...</div>
      ) : null}

      {!loading && ['all_plans', 'landlord_plans', 'property_seeker_plans'].includes(activeTab) ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPlans.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">No plans found</div>
          ) : filteredPlans.map((plan) => (
            <button
              key={plan._id}
              onClick={() => setSelectedPlanPreview(plan)}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md"
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{plan.name || 'N/A'}</h3>
                  <p className="mt-1 text-xs text-slate-500">{plan.description || 'No description provided'}</p>
                </div>
                <div className="flex gap-2">
                  {plan.planType === 'property_seeker' ? (
                    <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">Property Seeker</span>
                  ) : (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Landlord</span>
                  )}
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(plan.isActive ? 'active' : 'expired')}`}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-500">Monthly</p>
                  <p className="font-semibold text-slate-900">{formatUGX(plan.monthlyPrice || 0)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Annual</p>
                  <p className="font-semibold text-slate-900">{formatUGX(plan.annualPrice || 0)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Billing</p>
                  <p className="font-medium text-slate-700">{String(plan.billingModel || 'N/A').replaceAll('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-slate-500">Validity</p>
                  <p className="font-medium text-slate-700">{safeNumber(plan.validityDays)} days</p>
                </div>
                <div>
                  <p className="text-slate-500">Units</p>
                  <p className="font-medium text-slate-700">{plan.maxUnits ?? 'Unlimited'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Views / Visits</p>
                  <p className="font-medium text-slate-700">{safeNumber(plan.includedViews)} / {safeNumber(plan.includedVisits)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {!loading && ['assigned_plans', 'trial', 'expired', 'past_due'].includes(activeTab) ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1280px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">User / Business</th>
                <th className="px-4 py-3">User Type</th>
                <th className="px-4 py-3">Assigned Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Billing Cycle</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">Renewal / Expiry</th>
                <th className="px-4 py-3">Manual / Auto</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">No assigned plans found</td>
                </tr>
              ) : filteredAssignments.map((assignment) => (
                <tr key={assignment.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{assignment.user || 'N/A'}</p>
                    <p className="text-xs text-slate-500">{assignment.business || 'N/A'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{assignment.userType || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-700">{assignment.assignedPlan || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-900">{formatUGX(assignment.amount || 0)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(assignment.status)}`}>
                      {String(assignment.status || 'N/A').replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{String(assignment.billingCycle || 'N/A').replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3 text-slate-700">{safeDate(assignment.startDate)}</td>
                  <td className="px-4 py-3 text-slate-700">{safeDate(assignment.renewalDate || assignment.expiryDate)}</td>
                  <td className="px-4 py-3 text-slate-700">{assignment.assignmentMode || 'Manual Assignment'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openEditAssignment(assignment)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-700">View</button>
                      <button onClick={() => openEditAssignment(assignment)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-700">Edit Assignment</button>
                      <button onClick={() => cancelAssignment(assignment.id)} className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs text-rose-700">Cancel</button>
                      <button onClick={() => openEditAssignment(assignment)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-700">Renew</button>
                      <button onClick={() => openEditAssignment(assignment)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-700">Change Plan</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {showPlanModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{planForm.id ? 'Edit Plan' : 'Create New Plan'}</h2>
                <p className="mt-1 text-sm text-slate-500">This plan will be available for manual assignment now. It will be billed automatically once Mobile Money gateway is connected.</p>
              </div>
              <button onClick={() => setShowPlanModal(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600">Close</button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                Plan Type
                <select
                  value={planForm.planType}
                  onChange={(event) => {
                    const nextPlanType = event.target.value;
                    setPlanForm((state) => ({
                      ...state,
                      planType: nextPlanType,
                      selectedPlanTemplateId: '',
                      name: '',
                      billingModel: nextPlanType === 'property_seeker' ? 'pay_per_view' : 'monthly'
                    }));
                  }}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                >
                  <option value="landlord">Landlord Plan</option>
                  <option value="property_seeker">Property Seeker Plan</option>
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Registered Plan
                <select
                  value={planForm.selectedPlanTemplateId}
                  onChange={(event) => {
                    const selectedPlanTemplateId = event.target.value;
                    if (!selectedPlanTemplateId) {
                      setPlanForm((state) => ({
                        ...state,
                        selectedPlanTemplateId,
                        name: ''
                      }));
                      return;
                    }

                    const selectedPlan = plans.find((item) => item._id === selectedPlanTemplateId);
                    if (!selectedPlan) return;

                    setPlanForm((state) => ({
                      ...state,
                      selectedPlanTemplateId,
                      name: selectedPlan.name || '',
                      description: selectedPlan.description || '',
                      billingModel: selectedPlan.billingModel || state.billingModel,
                      monthlyPrice: safeNumber(selectedPlan.monthlyPrice),
                      annualPrice: safeNumber(selectedPlan.annualPrice),
                      price: safeNumber(selectedPlan.price),
                      includedViews: safeNumber(selectedPlan.includedViews),
                      includedVisits: safeNumber(selectedPlan.includedVisits),
                      maxProperties: selectedPlan.maxProperties ?? '',
                      maxUnits: selectedPlan.maxUnits ?? '',
                      maxTenants: selectedPlan.maxTenants ?? '',
                      maxDocuments: selectedPlan.maxDocuments ?? '',
                      whatsAppAlertsLimit: selectedPlan.whatsAppAlertsLimit ?? '',
                      validityDays: safeNumber(selectedPlan.validityDays || 30),
                      featuresInput: (Array.isArray(selectedPlan.features) ? selectedPlan.features : []).join(', '),
                      status: selectedPlan.isActive ? 'active' : 'inactive',
                      propertyDisplayEnabled: selectedPlan.propertyDisplayEnabled !== false
                    }));
                  }}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                >
                  <option value="">Create New Plan</option>
                  {plans
                    .filter((item) => String(item.planType || 'landlord') === String(planForm.planType))
                    .map((item) => (
                      <option key={item._id} value={item._id}>{item.name || 'N/A'}</option>
                    ))}
                </select>
              </label>
              {!planForm.selectedPlanTemplateId ? (
                <label className="text-sm text-slate-600">
                  Plan Name
                  <input value={planForm.name} onChange={(event) => setPlanForm((state) => ({ ...state, name: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                </label>
              ) : null}
              <label className="text-sm text-slate-600 md:col-span-2">
                Description
                <input value={planForm.description} onChange={(event) => setPlanForm((state) => ({ ...state, description: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label className="text-sm text-slate-600">
                Billing Model
                <select value={planForm.billingModel} onChange={(event) => setPlanForm((state) => ({ ...state, billingModel: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
                  {planForm.planType === 'property_seeker' ? (
                    <>
                      <option value="pay_per_view">pay_per_view</option>
                      <option value="pay_per_visit">pay_per_visit</option>
                      <option value="monthly_bundle">monthly_bundle</option>
                      <option value="credit_bundle">credit_bundle</option>
                    </>
                  ) : (
                    <>
                      <option value="monthly">monthly</option>
                      <option value="annual">annual</option>
                      <option value="trial">trial</option>
                    </>
                  )}
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Status
                <select value={planForm.status} onChange={(event) => setPlanForm((state) => ({ ...state, status: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Monthly Price
                <input type="number" value={planForm.monthlyPrice} onChange={(event) => setPlanForm((state) => ({ ...state, monthlyPrice: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label className="text-sm text-slate-600">
                Annual Price
                <input type="number" value={planForm.annualPrice} onChange={(event) => setPlanForm((state) => ({ ...state, annualPrice: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label className="text-sm text-slate-600">
                Price
                <input type="number" value={planForm.price} onChange={(event) => setPlanForm((state) => ({ ...state, price: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label className="text-sm text-slate-600">
                Validity Days
                <input type="number" value={planForm.validityDays} onChange={(event) => setPlanForm((state) => ({ ...state, validityDays: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label className="text-sm text-slate-600">
                Number of Units Allowed
                <input
                  value={planForm.maxUnits}
                  onChange={(event) => setPlanForm((state) => ({ ...state, maxUnits: event.target.value }))}
                  placeholder="Leave empty for unlimited"
                  disabled={planForm.planType === 'property_seeker'}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
                {planForm.planType === 'property_seeker' ? (
                  <span className="mt-1 block text-xs text-slate-400">Units limit applies to landlord plans only.</span>
                ) : null}
              </label>
              {planForm.planType === 'property_seeker' ? (
                <>
                  <label className="text-sm text-slate-600">
                    Included Views
                    <input type="number" value={planForm.includedViews} onChange={(event) => setPlanForm((state) => ({ ...state, includedViews: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                  </label>
                  <label className="text-sm text-slate-600">
                    Included Visits
                    <input type="number" value={planForm.includedVisits} onChange={(event) => setPlanForm((state) => ({ ...state, includedVisits: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                  </label>
                </>
              ) : (
                <>
                  <label className="text-sm text-slate-600">
                    Max Properties
                    <input value={planForm.maxProperties} onChange={(event) => setPlanForm((state) => ({ ...state, maxProperties: event.target.value }))} placeholder="Leave empty for unlimited" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                  </label>
                  <label className="text-sm text-slate-600">
                    Max Tenants
                    <input value={planForm.maxTenants} onChange={(event) => setPlanForm((state) => ({ ...state, maxTenants: event.target.value }))} placeholder="Leave empty for unlimited" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                  </label>
                  <label className="text-sm text-slate-600">
                    Max Documents
                    <input value={planForm.maxDocuments} onChange={(event) => setPlanForm((state) => ({ ...state, maxDocuments: event.target.value }))} placeholder="Optional" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                  </label>
                  <label className="text-sm text-slate-600">
                    WhatsApp Alerts Limit
                    <input value={planForm.whatsAppAlertsLimit} onChange={(event) => setPlanForm((state) => ({ ...state, whatsAppAlertsLimit: event.target.value }))} placeholder="Optional" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={Boolean(planForm.propertyDisplayEnabled)}
                      onChange={(event) => setPlanForm((state) => ({ ...state, propertyDisplayEnabled: event.target.checked }))}
                      className="h-4 w-4 rounded border border-slate-300"
                    />
                    Activate property display under this plan
                  </label>
                </>
              )}
              <label className="text-sm text-slate-600 md:col-span-2">
                Features List (comma separated)
                <textarea value={planForm.featuresInput} onChange={(event) => setPlanForm((state) => ({ ...state, featuresInput: event.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowPlanModal(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Cancel</button>
              <button onClick={submitPlan} disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                {saving ? 'Saving...' : 'Save / Create Plan'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAssignModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{assignForm.id ? 'Edit Assignment' : 'Assign Plan'}</h2>
                <p className="mt-1 text-sm text-slate-500">Manual assignment is active now. Auto-billing and renewals will run once Mobile Money gateway is integrated.</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600">Close</button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                Assign To
                <select value={assignForm.userType} onChange={(event) => setAssignForm((state) => ({ ...state, userType: event.target.value, userId: '', planId: '', subscribedMonths: 1, amount: 0, startDate: '', expiryDate: '', renewalDate: '' }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="landlord">Landlord</option>
                  <option value="property_seeker">Property Seeker</option>
                </select>
              </label>
              <label className="text-sm text-slate-600">
                User Search
                <select value={assignForm.userId} onChange={(event) => setAssignForm((state) => ({ ...state, userId: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="">Select user</option>
                  {filteredAssignmentUsers.map((user) => (
                    <option key={user.id || user.userId} value={user.id || user.userId}>
                      {user.landlordName || user.fullName || user.email || 'N/A'} - {user.email || 'N/A'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Selected Plan
                <select value={assignForm.planId} onChange={(event) => setAssignForm((state) => ({ ...state, planId: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="">Select plan</option>
                  {assignablePlans.map((plan) => (
                    <option key={plan._id} value={plan._id}>{plan.name || 'N/A'}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Billing Cycle
                <select value={assignForm.billingCycle} onChange={(event) => setAssignForm((state) => ({ ...state, billingCycle: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                  <option value="pay_per_use">Pay Per Use</option>
                  <option value="credit_bundle">Credit Bundle</option>
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Number of Months
                <input
                  type="number"
                  min={1}
                  value={assignForm.subscribedMonths}
                  onChange={(event) => setAssignForm((state) => ({ ...state, subscribedMonths: Math.max(1, safeNumber(event.target.value || 1)) }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="text-sm text-slate-600">
                Start Date
                <input type="date" value={assignForm.startDate} onChange={(event) => setAssignForm((state) => ({ ...state, startDate: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label className="text-sm text-slate-600">
                Auto Calculated Amount
                <input
                  type="number"
                  value={assignForm.amount}
                  readOnly
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700"
                />
              </label>
              <label className="text-sm text-slate-600">
                Renewal Date
                <input type="date" value={assignForm.renewalDate} onChange={(event) => setAssignForm((state) => ({ ...state, renewalDate: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label className="text-sm text-slate-600">
                Expiry Date
                <input type="date" value={assignForm.expiryDate} readOnly className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700" />
              </label>
              <label className="text-sm text-slate-600">
                Status
                <select value={assignForm.status} onChange={(event) => setAssignForm((state) => ({ ...state, status: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="expired">Expired</option>
                  <option value="past_due">Past Due</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label className="text-sm text-slate-600 md:col-span-2">
                Notes
                <textarea value={assignForm.notes} onChange={(event) => setAssignForm((state) => ({ ...state, notes: event.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowAssignModal(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Cancel</button>
              <button onClick={submitAssignment} disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                {saving ? 'Saving...' : 'Assign Plan'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedPlanPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{selectedPlanPreview.name || 'Plan Details'}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedPlanPreview.description || 'No description provided'}</p>
              </div>
              <button onClick={() => setSelectedPlanPreview(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600">Close</button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 text-sm">
              <p><span className="text-slate-500">Type:</span> {selectedPlanPreview.planType === 'property_seeker' ? 'Property Seeker' : 'Landlord'}</p>
              <p><span className="text-slate-500">Status:</span> {selectedPlanPreview.isActive ? 'Active' : 'Inactive'}</p>
              <p><span className="text-slate-500">Monthly:</span> {formatUGX(selectedPlanPreview.monthlyPrice || 0)}</p>
              <p><span className="text-slate-500">Annual:</span> {formatUGX(selectedPlanPreview.annualPrice || 0)}</p>
              <p><span className="text-slate-500">Billing Model:</span> {String(selectedPlanPreview.billingModel || 'N/A').replaceAll('_', ' ')}</p>
              <p><span className="text-slate-500">Validity:</span> {safeNumber(selectedPlanPreview.validityDays)} days</p>
              <p><span className="text-slate-500">Max Properties:</span> {selectedPlanPreview.maxProperties ?? 'Unlimited'}</p>
              <p><span className="text-slate-500">Max Units:</span> {selectedPlanPreview.maxUnits ?? 'Unlimited'}</p>
              <p><span className="text-slate-500">Max Tenants:</span> {selectedPlanPreview.maxTenants ?? 'Unlimited'}</p>
              <p><span className="text-slate-500">Property Display:</span> {selectedPlanPreview.propertyDisplayEnabled === false ? 'Disabled' : 'Enabled'}</p>
              <p><span className="text-slate-500">Included Views:</span> {safeNumber(selectedPlanPreview.includedViews)}</p>
              <p><span className="text-slate-500">Included Visits:</span> {safeNumber(selectedPlanPreview.includedVisits)}</p>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-500">Features</p>
              <p className="mt-1 text-sm text-slate-700">{Array.isArray(selectedPlanPreview.features) && selectedPlanPreview.features.length > 0 ? selectedPlanPreview.features.join(', ') : 'N/A'}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => { setSelectedPlanPreview(null); openEditPlan(selectedPlanPreview); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700">Edit Plan</button>
              <button onClick={async () => { try { setSaving(true); await api.put(`/super-admin/plans/${selectedPlanPreview._id}`, { isActive: !selectedPlanPreview.isActive, status: selectedPlanPreview.isActive ? 'inactive' : 'active' }); setSelectedPlanPreview(null); await loadPageData(); } catch (err) { setError(err.response?.data?.message || err.message || 'Failed to update plan status'); } finally { setSaving(false); } }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700">{selectedPlanPreview.isActive ? 'Disable' : 'Activate'}</button>
              <button onClick={async () => { try { setSaving(true); await api.delete(`/super-admin/plans/${selectedPlanPreview._id}`); setSelectedPlanPreview(null); await loadPageData(); } catch (err) { setError(err.response?.data?.message || err.message || 'Failed to delete plan'); } finally { setSaving(false); } }} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-700">Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SuperAdminSubscriptions;
