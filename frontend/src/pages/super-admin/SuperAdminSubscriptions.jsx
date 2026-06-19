import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import SubscriptionTabs from '../../components/subscriptions/SubscriptionTabs';
import SubscriptionSummaryCard from '../../components/subscriptions/SubscriptionSummaryCard';
import SubscriptionTable from '../../components/subscriptions/SubscriptionTable';
import SubscriptionPlanTable from '../../components/subscriptions/SubscriptionPlanTable';
import CreatePlanModal from '../../components/subscriptions/CreatePlanModal';
import { formatUGX } from '../../utils/currency';

const defaultAnalytics = {
  totalSubscriptions: 0,
  activeSubscriptions: 0,
  trialSubscriptions: 0,
  expiredSubscriptions: 0,
  monthlyRevenue: 0,
  annualRevenue: 0,
  churnRate: 0,
  pendingPayments: 0
};

const SuperAdminSubscriptions = () => {
  const [activeTab, setActiveTab] = useState('managers');
  const [analytics, setAnalytics] = useState(defaultAnalytics);
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    fetchPlans();
    fetchSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/super-admin/subscriptions-analytics');
      const data = res.data?.report || {};
      setAnalytics({
        totalSubscriptions: data.totalCompanies ?? 0,
        activeSubscriptions: data.activeSubscriptions ?? 0,
        trialSubscriptions: data.trialUsers ?? 0,
        expiredSubscriptions: data.expiredSubscriptions ?? 0,
        monthlyRevenue: data.monthlyRevenue ?? 0,
        annualRevenue: data.annualRevenue ?? 0,
        churnRate: data.churnRate ?? 0,
        pendingPayments: data.pendingPayments ?? 0
      });
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setError(null);
      const role = activeTab === 'managers' ? 'manager' : activeTab === 'owners' ? 'owner' : activeTab === 'self' ? 'self_owner' : undefined;
      const res = await api.get('/super-admin/users', { params: { page: 1, limit: 50, role } });
      const users = Array.isArray(res.data.users) ? res.data.users : [];
      const mapped = users.map(u => ({
        id: u._id,
        companyId: u.company?._id,
        accountName: u.name,
        accountType: u.role,
        email: u.email,
        currentPlan: u.company?.subscriptionPlan?.name || 'N/A',
        billingCycle: u.company?.billingCycle || 'monthly',
        amount: u.company?.subscriptionPlan?.monthlyPrice ?? 0,
        status: u.company?.subscriptionStatus || 'n/a',
        startDate: u.company?.subscriptionStartDate,
        expiryDate: u.company?.subscriptionEndDate,
        paymentStatus: 'paid'
      }));
      setSubscriptions(mapped);
    } catch (err) {
      setError(err.message || 'Failed to load subscriptions');
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get('/super-admin/plans');
      setPlans(Array.isArray(res.data.plans) ? res.data.plans : []);
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
     

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <SubscriptionSummaryCard label="Total Subscriptions" value={analytics.totalSubscriptions} />
        <SubscriptionSummaryCard label="Active Subscriptions" value={analytics.activeSubscriptions} color="green" />
        <SubscriptionSummaryCard label="Trial Subscriptions" value={analytics.trialSubscriptions} color="blue" />
        <SubscriptionSummaryCard label="Expired Subscriptions" value={analytics.expiredSubscriptions} color="red" />
        <SubscriptionSummaryCard label="Monthly Revenue" value={formatUGX(analytics.monthlyRevenue ?? 0)} />
        <SubscriptionSummaryCard label="Annual Revenue" value={formatUGX(analytics.annualRevenue ?? 0)} />
        <SubscriptionSummaryCard label="Churn Rate" value={`${(analytics.churnRate ?? 0)}%`} />
        <SubscriptionSummaryCard label="Pending Payments" value={analytics.pendingPayments ?? 0} />
      </div>

      <SubscriptionTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="mt-4">
        {activeTab === 'plans' ? (
          <SubscriptionPlanTable plans={plans} refresh={() => fetchPlans()} onEdit={(p) => { setEditPlan(p); setShowCreatePlan(true); }} />
        ) : (
          <SubscriptionTable rows={subscriptions} onSuspend={async (companyId) => { await api.post(`/super-admin/customers/${companyId}/suspend`); fetchSubscriptions(); }} onActivate={async (companyId) => { await api.post(`/super-admin/customers/${companyId}/activate`); fetchSubscriptions(); }} />
        )}
      </div>

      {showCreatePlan && <CreatePlanModal plan={editPlan} onClose={() => { setEditPlan(null); setShowCreatePlan(false); fetchPlans(); }} />}
    </div>
  );
};

export default SuperAdminSubscriptions;
