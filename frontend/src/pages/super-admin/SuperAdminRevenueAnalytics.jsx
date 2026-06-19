import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatUGX } from '../../utils/currency';

const SuperAdminRevenueAnalytics = () => {
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
      const response = await api.get('/super-admin/revenue-analytics');
      setAnalytics(response.data.analytics || response.data);
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
      <h1 className="text-3xl font-bold mb-6">Revenue Analytics</h1>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Total MRR" value={formatUGX(analytics.totalMRR || 0)} color="green" />
        <KPICard label="Total ARR" value={formatUGX(analytics.totalARR || 0)} color="blue" />
        <KPICard label="Monthly Growth" value={`${analytics.monthlyGrowth?.toFixed(1)}%`} color="green" />
        <KPICard label="Average Contract Value" value={formatUGX(analytics.acv || 0)} color="blue" />
      </div>

      {/* Revenue by Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Revenue by Plan</h2>
          <div className="space-y-3">
            {Object.entries(analytics.revenueByPlan || {}).map(([plan, revenue]) => (
              <div key={plan} className="flex justify-between p-3 bg-gray-50 rounded">
                <span className="capitalize font-medium">{plan}</span>
                <span className="font-bold text-green-600">{formatUGX(revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Top Customers</h2>
          <div className="space-y-3">
            {analytics.topCustomers && analytics.topCustomers.map((customer, idx) => (
              <div key={idx} className="flex justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium truncate">{customer.company}</span>
                <span className="font-bold text-green-600">{formatUGX(customer.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Monthly Revenue Trend</h2>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {analytics.monthlyRevenue && analytics.monthlyRevenue.map((month, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">{month.month}</span>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="font-bold text-green-600">{formatUGX(month.revenue)}</p>
                </div>
                <div className="w-20 h-12 bg-gradient-to-r from-blue-200 to-blue-400 rounded flex items-end justify-end pr-2">
                  <div style={{ height: `${Math.min((month.revenue / 10000) * 100, 100)}%` }} className="w-1 bg-blue-600"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Revenue by Payment Method</h2>
        <div className="space-y-3">
          {Object.entries(analytics.revenueByPaymentMethod || {}).map(([method, revenue]) => (
            <div key={method} className="flex justify-between p-3 bg-gray-50 rounded">
              <span className="capitalize font-medium">{method}</span>
              <span className="font-bold text-green-600">{formatUGX(revenue)}</span>
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

export default SuperAdminRevenueAnalytics;
