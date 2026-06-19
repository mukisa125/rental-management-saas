import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SuperAdminSubscriptionAnalytics = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/subscriptions-analytics');
      setAnalytics(response.data.report || response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!analytics) return <div className="p-4">No data</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Subscription Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Total Companies" value={analytics.totalCompanies} />
        <KPICard label="Active Subscriptions" value={analytics.activeSubscriptions} color="green" />
        <KPICard label="Trial Users" value={analytics.trialUsers} color="blue" />
        <KPICard label="Churn Rate" value={`${analytics.churnRate?.toFixed(1)}%`} color="red" />
      </div>

      {/* Subscription by Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Distribution by Plan</h2>
          <div className="space-y-3">
            {Object.entries(analytics.subscriptionsByPlan || {}).map(([plan, count]) => (
              <div key={plan} className="flex justify-between p-3 bg-gray-50 rounded">
                <span className="capitalize font-medium">{plan}</span>
                <span className="font-bold text-blue-600">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Distribution by Status</h2>
          <div className="space-y-3">
            {Object.entries(analytics.subscriptionsByStatus || {}).map(([status, count]) => (
              <div key={status} className="flex justify-between p-3 bg-gray-50 rounded">
                <span className="capitalize font-medium">{status}</span>
                <span className={`font-bold ${
                  status === 'active' ? 'text-green-600' :
                  status === 'trial' ? 'text-blue-600' :
                  'text-red-600'
                }`}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Monthly Trends</h2>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {analytics.monthlyTrends && analytics.monthlyTrends.map((trend, idx) => (
            <div key={idx} className="flex justify-between p-3 bg-gray-50 rounded">
              <span>{trend.month}</span>
              <div className="text-sm space-x-4">
                <span className="text-green-600">New: {trend.newSubscriptions}</span>
                <span className="text-red-600">Churned: {trend.churnedSubscriptions}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ label, value, color = 'gray' }) => {
  const colorClass = {
    gray: 'bg-gray-100 border-gray-300',
    green: 'bg-green-100 border-green-300',
    red: 'bg-red-100 border-red-300',
    blue: 'bg-blue-100 border-blue-300'
  }[color];

  return (
    <div className={`${colorClass} border rounded-lg p-4`}>
      <p className="text-gray-600 text-sm">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
};

export default SuperAdminSubscriptionAnalytics;
