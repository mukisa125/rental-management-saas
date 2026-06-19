import { useEffect, useState } from 'react';
import { tenantPortalAPI } from '../../services/api';
import StatCard from '../../components/StatCard';
import { DollarSign, Wrench, Calendar, FileText } from 'lucide-react';
import { formatUGX } from '../../utils/currency';

const TenantDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await tenantPortalAPI.getDashboard();
      setSummary(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const daysUntilDue = summary?.nextDueDate ? 
    Math.ceil((new Date(summary.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Your Rental Portal</h1>
        <p className="text-gray-600 mt-2">Manage your rental payments, maintenance requests, and documents all in one place.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Current Rent"
          value={formatUGX(summary?.currentRent)}
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="Next Due Date"
          value={summary?.nextDueDate ? new Date(summary.nextDueDate).toLocaleDateString() : 'N/A'}
          subtitle={daysUntilDue > 0 ? `${daysUntilDue} days remaining` : 'Due now'}
          icon={Calendar}
          color={daysUntilDue <= 7 ? 'red' : 'green'}
        />
        <StatCard
          title="Outstanding Balance"
          value={formatUGX(summary?.outstandingBalance)}
          icon={DollarSign}
          color={summary?.outstandingBalance > 0 ? 'red' : 'green'}
        />
        <StatCard
          title="Active Maintenance"
          value={summary?.activeMaintenanceRequests || 0}
          subtitle="requests"
          icon={Wrench}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a
            href="/tenant/payments"
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition"
          >
            <DollarSign className="w-8 h-8 text-primary-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Make Payment</span>
          </a>
          <a
            href="/tenant/maintenance"
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition"
          >
            <Wrench className="w-8 h-8 text-primary-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Submit Request</span>
          </a>
          <a
            href="/tenant/my-rental"
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition"
          >
            <FileText className="w-8 h-8 text-primary-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">View Lease</span>
          </a>
          <a
            href="/tenant/documents"
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition"
          >
            <FileText className="w-8 h-8 text-primary-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Documents</span>
          </a>
        </div>
      </div>

      {/* Lease Information */}
      {summary?.leaseEndDate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-4">Lease Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">Lease Expires In</span>
                <span className="font-semibold text-gray-900">{summary.daysRemainingOnLease} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Lease End Date</span>
                <span className="font-semibold text-gray-900">
                  {new Date(summary.leaseEndDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <h3 className="font-semibold text-gray-900 mb-4">Payment Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">Outstanding Amount</span>
                <span className="font-semibold text-red-600">{formatUGX(summary.outstandingBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Monthly Rent</span>
                <span className="font-semibold text-gray-900">{formatUGX(summary.currentRent)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDashboard;
