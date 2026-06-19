import { useEffect, useState } from 'react';
import { ownerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import { Building2, Home, DollarSign, AlertCircle, User, Mail, Phone } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatUGX } from '../../utils/currency';

const OwnerDashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [occupancyMetrics, setOccupancyMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, trendRes, occupancyRes] = await Promise.all([
        ownerAPI.getFinancialSummary(),
        ownerAPI.getRevenueTrend(),
        ownerAPI.getOccupancyMetrics()
      ]);

      setSummary(summaryRes.data);
      setRevenueTrend(trendRes.data);
      setOccupancyMetrics(occupancyRes.data);
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your property overview.</p>
      </div>

      {/* Account Information Card */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-primary-100 text-sm">Account Owner</p>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              {user?.company && <p className="text-primary-200 text-sm">{user.company}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-primary-100 text-sm">Email</p>
            <p className="font-semibold">{user?.email}</p>
            {user?.phone && (
              <>
                <p className="text-primary-100 text-sm mt-2">Phone</p>
                <p className="font-semibold">{user.phone}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Properties"
          value={summary?.propertiesCount || 0}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Occupied Units"
          value={summary?.occupiedUnits || 0}
          subtitle={`of ${summary?.totalUnits || 0}`}
          icon={Home}
          color="green"
        />
        <StatCard
          title="Monthly Income"
          value={formatUGX(summary?.totalIncome)}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Outstanding Rent"
          value={formatUGX(summary?.pendingPayments)}
          icon={AlertCircle}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#2563eb"
                dot={{ fill: '#2563eb' }}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy Rate Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Property Occupancy</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={occupancyMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="propertyName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="occupiedUnits" fill="#10b981" name="Occupied" />
              <Bar dataKey="vacantUnits" fill="#ef4444" name="Vacant" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Occupancy Rate</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.occupancyRate || 0}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Net Income</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {formatUGX(summary?.netIncome)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Maintenance Costs</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {formatUGX(summary?.maintenanceCosts)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
