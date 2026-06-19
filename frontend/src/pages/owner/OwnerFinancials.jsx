import { useEffect, useState } from 'react';
import { ownerAPI } from '../../services/api';
import { DollarSign, TrendingUp, AlertCircle, Download } from 'lucide-react';
import { formatUGX } from '../../utils/currency';

const OwnerFinancials = () => {
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchFinancials();
  }, [dateRange]);

  const fetchFinancials = async () => {
    try {
      const response = await ownerAPI.getFinancialSummary({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      setFinancials(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching financials:', error);
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    // Implementation for PDF export
    alert('PDF export functionality coming soon');
  };

  const handleExportExcel = () => {
    // Implementation for Excel export
    alert('Excel export functionality coming soon');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600 mt-2">View your income and expenses</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Date Range</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {formatUGX(financials?.totalIncome)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">
                {formatUGX(financials?.pendingPayments)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Payments</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {formatUGX(financials?.overduePayments)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {formatUGX(financials?.netIncome)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <span className="text-gray-700">Total Income</span>
              <span className="font-semibold text-gray-900">
                {formatUGX(financials?.totalIncome)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b">
              <span className="text-gray-700">Maintenance Costs</span>
              <span className="font-semibold text-red-600">
                -{formatUGX(financials?.maintenanceCosts)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-4 bg-gray-50 px-4 py-2 rounded-lg">
              <span className="font-semibold text-gray-900">Net Income</span>
              <span className="font-bold text-gray-900 text-lg">
                {formatUGX(financials?.netIncome)}
              </span>
            </div>
          </div>
        </div>

        {/* Occupancy & Collections */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">Occupancy Rate</span>
                <span className="font-semibold text-gray-900">{financials?.occupancyRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${financials?.occupancyRate}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Units</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{financials?.totalUnits || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Occupied</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{financials?.occupiedUnits || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerFinancials;
