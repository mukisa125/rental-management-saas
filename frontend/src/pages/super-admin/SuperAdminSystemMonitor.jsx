import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SuperAdminSystemMonitor = () => {
  const { token } = useAuth();
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/system-monitor');
      setSystemHealth(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!systemHealth) return <div className="p-4">No data</div>;

  const getHealthColor = (status) => {
    if (status === 'healthy') return 'text-green-600';
    if (status === 'warning') return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">System Monitor</h1>

      {/* Health Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Database Health</h2>
          <p className={`text-2xl font-bold ${getHealthColor(systemHealth.databaseHealth)}`}>
            {systemHealth.databaseHealth?.toUpperCase()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">API Health</h2>
          <p className={`text-2xl font-bold ${getHealthColor(systemHealth.apiHealth)}`}>
            {systemHealth.apiHealth?.toUpperCase()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Backup Status</h2>
          <p className="text-2xl font-bold capitalize text-blue-600">
            {systemHealth.backupStatus}
          </p>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">CPU Usage</h2>
          <div className="space-y-2">
            <div className="flex justify-between mb-2">
              <span>{systemHealth.cpuUsage}%</span>
              <span className={systemHealth.cpuUsage > 80 ? 'text-red-500' : 'text-green-500'}>
                {systemHealth.cpuUsage > 80 ? 'High' : 'Normal'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${systemHealth.cpuUsage > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${systemHealth.cpuUsage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Memory Usage</h2>
          <div className="space-y-2">
            <div className="flex justify-between mb-2">
              <span>{systemHealth.memoryUsage}%</span>
              <span className={systemHealth.memoryUsage > 80 ? 'text-red-500' : 'text-green-500'}>
                {systemHealth.memoryUsage > 80 ? 'High' : 'Normal'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${systemHealth.memoryUsage > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${systemHealth.memoryUsage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Logs */}
      {systemHealth.errors && systemHealth.errors.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Recent Errors</h2>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {systemHealth.errors.map((error, idx) => (
              <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="font-semibold text-red-700">{error.code}</p>
                <p className="text-sm text-gray-600">{error.message}</p>
                <p className="text-xs text-gray-500">Count: {error.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {systemHealth.warnings && systemHealth.warnings.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Warnings</h2>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {systemHealth.warnings.map((warning, idx) => (
              <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-gray-600">{warning.message}</p>
                <p className="text-xs text-gray-500 capitalize">Severity: {warning.severity}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSystemMonitor;
