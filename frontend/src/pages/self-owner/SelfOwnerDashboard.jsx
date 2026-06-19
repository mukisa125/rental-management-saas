import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatUGX } from '../../utils/currency';

const SelfOwnerDashboard = () => {
  const { user, token } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/self-owner/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!dashboardData) return <div className="p-4">No data</div>;

  const { kpis } = dashboardData;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KPICard label="Total Properties" value={kpis?.totalProperties} />
        <KPICard label="Occupied Units" value={kpis?.occupiedUnits} color="green" />
        <KPICard label="Vacant Units" value={kpis?.vacantUnits} color="red" />
        <KPICard label="Occupancy Rate" value={`${kpis?.occupancyRate}%`} />
        <KPICard label="Active Tenants" value={kpis?.activeTenants} />
        <KPICard label="Monthly Income" value={formatUGX(kpis?.monthlyIncome)} color="blue" />
      </div>

      {/* Cards for key metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Outstanding Balance</h2>
          <p className="text-3xl font-bold text-red-500">{formatUGX(kpis?.outstandingBalance)}</p>
          <p className="text-gray-600 mt-2">Amount due from tenants</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Maintenance</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Open Requests</span>
              <span className="font-bold text-orange-500">{kpis?.openMaintenanceRequests}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed This Month</span>
              <span className="font-bold text-green-500">{kpis?.completedMaintenanceThisMonth}</span>
            </div>
          </div>
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

export default SelfOwnerDashboard;
