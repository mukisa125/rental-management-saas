import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SuperAdminSettings = () => {
  const { token } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/settings');
      setSettings(response.data.settings || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key, value) => {
    try {
      await api.put(`/super-admin/settings/${key}`, { value });
      setEditingKey(null);
      fetchSettings();
    } catch (err) {
      alert('Error updating setting');
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">System Settings</h1>

      <div className="responsive-table bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Setting</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Value</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(settings).map(([category, categorySettings]) => (
              <React.Fragment key={category}>
                {Object.entries(categorySettings).map(([key, setting]) => (
                  <tr key={`${category}-${key}`} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{setting.key}</td>
                    <td className="px-6 py-4">
                      {editingKey === setting.key ? (
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="px-3 py-1 border rounded w-full max-w-xs"
                          disabled={!setting.isEditable}
                        />
                      ) : (
                        <span className="text-gray-600">
                          {setting.isPublic ? setting.value : '••••••••'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 capitalize">{category}</td>
                    <td className="px-6 py-4 space-x-2">
                      {setting.isEditable && (
                        <>
                          {editingKey === setting.key ? (
                            <>
                              <button
                                onClick={() => handleUpdateSetting(setting.key, editingValue)}
                                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingKey(null)}
                                className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingKey(setting.key);
                                setEditingValue(setting.value);
                              }}
                              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                            >
                              Edit
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
        <p>💡 <strong>Tip:</strong> Only editable settings can be modified. Sensitive values are masked for security.</p>
      </div>
    </div>
  );
};

export default SuperAdminSettings;
