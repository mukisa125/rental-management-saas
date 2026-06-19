import React, { useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatUGX } from '../../utils/currency';

const SelfOwnerReports = () => {
  const { token } = useAuth();
  const [reportType, setReportType] = useState('revenue');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/self-owner/reports/${reportType}`, { params: { startDate, endDate } });
      setReport(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Reports</h1>

      {/* Report Generator */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Generate Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="revenue">Revenue Report</option>
              <option value="occupancy">Occupancy Report</option>
              <option value="maintenance">Maintenance Report</option>
              <option value="property">Property Report</option>
              <option value="growth">Growth Report</option>
              <option value="summary">Executive Summary</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 mb-6">{error}</div>}

      {/* Report Content */}
      {report && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6 capitalize">{reportType} Report</h2>

          {reportType === 'revenue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReportCard label="Total Revenue" value={formatUGX(report.totalRentRevenue)} />
                <ReportCard label="Average Monthly" value={formatUGX((report.totalRentRevenue || 0) / 12)} />
                <ReportCard label="Top Paying Tenant" value={formatUGX(report.topPayingTenants?.[0]?.amount)} />
              </div>
              {report.revenueByMonth && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Revenue by Month</h3>
                  <div className="space-y-2">
                    {report.revenueByMonth.map((month, idx) => (
                      <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>{month.month}</span>
                        <span className="font-bold">{formatUGX(month.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {reportType === 'occupancy' && (
            <div className="space-y-6">
              <ReportCard label="Overall Occupancy Rate" value={`${report.occupancyRate}%`} />
              {report.occupancyByProperty && (
                <div>
                  <h3 className="font-semibold mb-4">By Property</h3>
                  <div className="space-y-2">
                    {report.occupancyByProperty.map((prop, idx) => (
                      <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>{prop.propertyName}</span>
                        <span className="font-bold">{prop.occupancyRate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {reportType === 'maintenance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReportCard label="Total Requests" value={report.totalRequests} />
                <ReportCard label="Completed" value={report.completedRequests} />
                <ReportCard label="Avg Resolution Time" value={`${report.avgResolutionDays} days`} />
              </div>
              {report.maintenanceByStatus && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">By Status</h3>
                  <div className="space-y-2">
                    {Object.entries(report.maintenanceByStatus).map(([status, count], idx) => (
                      <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="capitalize">{status}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {reportType === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReportCard label="Total Properties" value={report.totalProperties} />
                <ReportCard label="Total Units" value={report.totalUnits} />
                <ReportCard label="Occupancy Rate" value={`${report.occupancyRate}%`} />
                <ReportCard label="Monthly Revenue" value={formatUGX(report.monthlyRevenue)} />
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2 border-t pt-6">
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              📥 Download PDF
            </button>
            <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              📊 Download Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ReportCard = ({ label, value }) => (
  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded border border-blue-200">
    <p className="text-gray-600 text-sm">{label}</p>
    <p className="text-2xl font-bold text-blue-600 mt-2">{value}</p>
  </div>
);

export default SelfOwnerReports;
