import { useEffect, useState } from 'react';
import api from '../../services/api';

const SuperAdminSupportTickets = () => {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await api.get('/super-admin/support-tickets');
        setTickets(Array.isArray(response.data?.tickets) ? response.data.tickets : []);
      } catch {
        setTickets([]);
      }
    };
    fetchTickets();
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Support Tickets</h1>
        <p className="mt-1 text-sm text-slate-500">Tickets from landlords, tenants, and property seekers.</p>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-500">
        {tickets.length ? `${tickets.length} support ticket(s) loaded.` : 'No records found'}
      </div>
    </div>
  );
};

export default SuperAdminSupportTickets;
