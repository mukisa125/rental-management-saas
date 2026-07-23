import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatUGX } from '../../utils/currency';

const SuperAdminRevenueAnalytics = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await api.get('/super-admin/reports');
        setReports(response.data?.reports || {});
      } catch (error) {
        setReports({});
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading...</div>;

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-6 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Platform revenue, growth, listing performance, and activity summary.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <p>Platform Revenue: <span className="font-semibold">{formatUGX(Number(reports?.platformRevenue) || 0)}</span></p>
        <p>Landlord Growth: <span className="font-semibold">{Number(reports?.landlordGrowth) || 0}</span></p>
        <p>Tenant Growth: <span className="font-semibold">{Number(reports?.tenantGrowth) || 0}</span></p>
        <p>Property Seeker Growth: <span className="font-semibold">{Number(reports?.propertySeekerGrowth) || 0}</span></p>
        <p>Visit Bookings: <span className="font-semibold">{Number(reports?.visitBookings) || 0}</span></p>
        <p>Subscription Revenue: <span className="font-semibold">{formatUGX(Number(reports?.subscriptionRevenue) || 0)}</span></p>
        <p>Seeker Billing Revenue: <span className="font-semibold">{formatUGX(Number(reports?.seekerBillingRevenue) || 0)}</span></p>
      </div>
    </div>
  );
};

export default SuperAdminRevenueAnalytics;
