import { useState, useEffect } from 'react';
import { Building2, DoorOpen, Users, DollarSign, AlertCircle, Wrench, Clock, Calendar } from 'lucide-react';
import StatCard from '../components/StatCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { propertyAPI, tenantAPI, paymentAPI, maintenanceAPI } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalUnits: 0,
    totalTenants: 0,
    monthlyRevenue: 0,
  });
  const [paymentStats, setPaymentStats] = useState({
    collected: 0,
    pending: 0,
    overdue: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [propertiesRes, tenantsRes, paymentStatsRes, maintenanceRes] = await Promise.all([
        propertyAPI.getAll(),
        tenantAPI.getAll(),
        paymentAPI.getStats(),
        maintenanceAPI.getAll({ status: 'open' }),
      ]);

      const properties = propertiesRes.data;
      const tenants = tenantsRes.data;
      const paymentData = paymentStatsRes.data;
      const maintenance = maintenanceRes.data;

      const totalUnits = properties.reduce((sum, p) => sum + (p.totalUnits || 0), 0);
      const totalProperties = properties.length;
      const totalTenants = tenants.length;

      setStats({
        totalProperties,
        totalUnits,
        totalTenants,
        monthlyRevenue: paymentData.monthlyRevenue || 0,
      });

      setPaymentStats({
        collected: paymentData.collected || 0,
        pending: paymentData.pending || 0,
        overdue: paymentData.overdue || 0,
      });

      // Generate recent activities
      const activities = [
        { type: 'payment', message: 'Rent payment received from John Doe', time: '2 hours ago' },
        { type: 'maintenance', message: 'New maintenance request from Jane Smith', time: '4 hours ago' },
        { type: 'tenant', message: 'Tenant Jane Smith moved in at Sunset Apartments', time: '1 day ago' },
        { type: 'property', message: 'Property Sunset Apartments updated', time: '2 days ago' },
      ];
      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: 'Collected', value: paymentStats.collected, color: '#16a34a' },
    { name: 'Pending', value: paymentStats.pending, color: '#f59e0b' },
    { name: 'Overdue', value: paymentStats.overdue, color: '#ef4444' },
  ];

  const quickStats = [
    { label: 'Overdue Payments', value: paymentStats.overdue, icon: AlertCircle, color: 'danger' },
    { label: 'Open Maintenance', value: '8', icon: Wrench, color: 'warning' },
    { label: 'Vacant Units', value: '6', icon: DoorOpen, color: 'secondary' },
    { label: 'Leases Expiring', value: '4', icon: Calendar, color: 'primary' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Properties"
          value={stats.totalProperties}
          icon={Building2}
          trend="up"
          trendValue="+2 this month"
          color="primary"
        />
        <StatCard
          title="Total Units"
          value={stats.totalUnits}
          icon={DoorOpen}
          trend="up"
          trendValue="+5 this month"
          color="secondary"
        />
        <StatCard
          title="Total Tenants"
          value={stats.totalTenants}
          icon={Users}
          trend="up"
          trendValue="+3 this month"
          color="success"
        />
        <StatCard
          title="Monthly Revenue"
          value={`UGX ${stats.monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend="up"
          trendValue="+12% from last month"
          color="primary"
        />
      </div>

      {/* Charts and Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rent Collection Overview */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Rent Collection Overview</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Collected</p>
              <p className="text-2xl font-bold text-green-600">{paymentStats.collected}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{paymentStats.pending}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{paymentStats.overdue}</p>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Activities</h2>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick View Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
              </div>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <button className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium">
                View →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
