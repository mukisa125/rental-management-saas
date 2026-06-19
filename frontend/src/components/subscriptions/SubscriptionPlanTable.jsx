import React from 'react';
import api from '../../services/api';
import axios from 'axios';
import { formatUGX } from '../../utils/currency';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SubscriptionPlanTable = ({ plans = [], refresh = () => {}, onEdit = () => {} }) => {
  if (!Array.isArray(plans) || plans.length === 0) return <div className="bg-white p-6 rounded-2xl border border-slate-200">No plans created yet</div>;

  return (
    <div className="responsive-table bg-white rounded-2xl border border-slate-200 shadow-sm">
      <table className="min-w-[900px] text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100 sticky top-0 bg-white">
            <th className="px-6 py-3">Name</th>
            <th className="px-6 py-3">Target</th>
            <th className="px-6 py-3">Monthly</th>
            <th className="px-6 py-3">Annual</th>
            <th className="px-6 py-3">Features</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {plans.map(p => (
            <tr key={p._id} className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-4 font-medium">{p.name}</td>
              <td className="px-6 py-4">{p.targetUserType || 'all'}</td>
              <td className="px-6 py-4">{formatUGX(p.monthlyPrice ?? 0)}</td>
              <td className="px-6 py-4">{formatUGX(p.annualPrice ?? 0)}</td>
              <td className="px-6 py-4">{(p.features || []).join(', ')}</td>
              <td className="px-6 py-4">{p.isActive ? 'Active' : 'Inactive'}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => onEdit(p)} className="px-3 py-1 rounded-md border">Edit</button>
                  <button className="px-3 py-1 rounded-md border">Deactivate</button>
                  <button onClick={async () => { if (!confirm('Delete this plan?')) return; try { await api.delete(`/super-admin/plans/${p._id}`); refresh(); } catch (err) { if (err.response?.status === 404) { const token = localStorage.getItem('token'); try { await axios.delete(`${API_URL}/api/super-admin/plans/${p._id}`, { headers: { Authorization: `Bearer ${token}` } }); refresh(); return; } catch (e) { /* fallthrough */ } } alert(err.response?.data?.message || err.message || 'Failed to delete plan'); } }} className="px-3 py-1 rounded-md border text-rose-600">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SubscriptionPlanTable;
