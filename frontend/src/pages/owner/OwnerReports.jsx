import { BarChart3, Download } from 'lucide-react';

const OwnerReports = () => {
  const handleExport = (format) => {
    alert(`${format.toUpperCase()} export functionality coming soon`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-2">Generate and export comprehensive reports about your properties</p>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Occupancy Report */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Occupancy Report</h3>
              <p className="text-gray-600 text-sm">Unit occupancy trends and rates</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('pdf')}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Revenue Report */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Revenue Report</h3>
              <p className="text-gray-600 text-sm">Income and financial summaries</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('pdf')}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Maintenance Cost Report */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Maintenance Cost Report</h3>
              <p className="text-gray-600 text-sm">Maintenance expenses and trends</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('pdf')}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Tax Report */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tax Report</h3>
              <p className="text-gray-600 text-sm">Annual tax preparation summary</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('pdf')}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerReports;
