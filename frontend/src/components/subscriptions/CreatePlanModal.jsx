import React, { useState } from 'react';
import api from '../../services/api';
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CreatePlanModal = ({ onClose, plan = null }) => {
  const [name, setName] = useState('');
  const [targetUserType, setTargetUserType] = useState('all');
  const [monthlyPrice, setMonthlyPrice] = useState(0);
  const [annualPrice, setAnnualPrice] = useState(0);
  const [features, setFeatures] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        name,
        targetUserType,
        monthlyPrice: Number(monthlyPrice),
        annualPrice: Number(annualPrice),
        features: features.split(',').map(f => f.trim()).filter(Boolean)
      };
      if (plan && plan._id) {
        await api.put(`/super-admin/plans/${plan._id}`, payload);
      } else {
        try {
          await api.post('/super-admin/plans', payload);
        } catch (err) {
          if (err.response?.status === 404) {
            // Fallback: try direct absolute URL (bypass dev proxy issues)
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/super-admin/plans`, payload, { headers: { Authorization: `Bearer ${token}` } });
          } else throw err;
        }
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (plan) {
      setName(plan.name || '');
      setTargetUserType(plan.targetUserType || 'all');
      setMonthlyPrice(plan.monthlyPrice ?? 0);
      setAnnualPrice(plan.annualPrice ?? 0);
      setFeatures((plan.features || []).join(', '));
    } else {
      setName(''); setTargetUserType('all'); setMonthlyPrice(0); setAnnualPrice(0); setFeatures('');
    }
  }, [plan]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">Create Subscription Plan</h2>
        {error && <div className="text-rose-600 mb-2">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Plan name" className="p-2 border rounded" />
          <select value={targetUserType} onChange={e => setTargetUserType(e.target.value)} className="p-2 border rounded">
            <option value="all">All</option>
            <option value="self_owner">Self Owner</option>
            <option value="tenant">Tenant</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <input value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} placeholder="Monthly price" type="number" className="p-2 border rounded" />
          <input value={annualPrice} onChange={e => setAnnualPrice(e.target.value)} placeholder="Annual price" type="number" className="p-2 border rounded" />
          <input value={features} onChange={e => setFeatures(e.target.value)} placeholder="Features (comma separated)" className="p-2 border rounded col-span-2" />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={submit} className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>{loading ? 'Saving...' : 'Save Plan'}</button>
        </div>
      </div>
    </div>
  );
};

export default CreatePlanModal;
