import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { propertyAPI, tenantAPI, paymentAPI, maintenanceAPI } from '../services/api';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    revenueData: [],
    occupancyData: [],
    paymentStatus: [],
    maintenanceStats: [],
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const [properties, tenants, payments, maintenance] = await Promise.all([
        propertyAPI.getAll(),
        tenantAPI.getAll(),
        paymentAPI.getAll(),
        maintenanceAPI.getAll(),
      ]);

      // Revenue data (mock data for demo)
      const revenueData = [
        { month: 'Jan', revenue: 8500000 },
        { month: 'Feb', revenue: 9200000 },
        { month: 'Mar', revenue: 7800000 },
        { month: 'Apr', revenue: 10500000 },
        { month: 'May', revenue: 11200000 },
        { month: 'Jun', revenue: 12450000 },
      ];

      // Occupancy data
      const occupancyData = properties.map((prop) => ({
        name: prop.name.substring(0, 15) + '...',
        occupied: prop.occupiedUnits,
        vacant: prop.vacantUnits,
      }));

      // Payment status
      const paid = payments.filter((p) => p.status === 'paid').length;
      const pending = payments.filter((p) => p.status === 'pending').length;
      const overdue = payments.filter((p) => p.status === 'overdue').length;

      const paymentStatus = [
        { name: 'Paid', value: paid, color: '#16a34a' },
        { name: 'Pending', value: pending, color: '#f59e0b' },
        { name: 'Overdue', value: overdue, color: '#ef4444' },
      ];

      // Maintenance stats
      const open = maintenance.filter((m) => m.status === 'open').length;
      const inProgress = maintenance.filter((m) => m.status === 'in_progress').length;
      const resolved = maintenance.filter((m) => m.status === 'resolved').length;

      const maintenanceStats = [
        { name: 'Open', value: open, color: '#f59e0b' },
        { name: 'In Progress', value: inProgress, color: '#3b82f6' },
        { name: 'Resolved', value: resolved, color: '#16a34a' },
      ];

      setReportData({
        revenueData,
        occupancyData,
        paymentStatus,
        maintenanceStats,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Revenue</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={reportData.revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `UGX ${value.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="revenue" fill="#16a34a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Property Occupancy</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.occupancyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="occupied" stackId="a" fill="#16a34a" />
              <Bar dataKey="vacant" stackId="a" fill="#94a3b8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Status */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.paymentStatus}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {reportData.paymentStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Maintenance Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Maintenance Requests Status</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={reportData.maintenanceStats}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {reportData.maintenanceStats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Reports;
