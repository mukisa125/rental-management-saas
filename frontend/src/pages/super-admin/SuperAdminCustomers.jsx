import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, CheckCircle2, Clock3, FileText, Plus, TrendingUp, UserPlus, Users } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import FiltersBar from '../../components/FiltersBar';
import CustomersTable from '../../components/CustomersTable';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
// ActivityCard removed; customers table uses full width now

const defaultPagination = { page: 1, pages: 1, total: 0, limit: 10 };

const mapUserToCustomer = (u) => ({
  _id: u._id,
  contactName: u.name,
  name: u.name,
  company: u.company,
  companyId: u.company?._id || u.company,
  companyName: u.company?.companyName || u.companyName || '',
  email: u.email,
  phone: u.phone || '',
  subscriptionPlan: u.subscriptionPlan || u.company?.subscriptionPlan || null,
  propertiesCount: u.propertiesCount ?? 0,
  unitsCount: u.unitsCount ?? 0,
  subscriptionStatus: u.approvalStatus || 'n/a',
  approvalStatus: u.approvalStatus || 'approved',
  createdAt: u.createdAt,
  role: u.role
});

const SuperAdminCustomers = () => {
  const { token, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(defaultPagination);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [companiesList, setCompaniesList] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    companyId: '',
    companyName: '',
    address: ''
  });

  const filteredCustomers = customers.filter((customer) => {
    if (!plan) return true;
    const planName = customer.subscriptionPlan?.name || customer.subscriptionPlan?.slug || '';
    return planName.toLowerCase() === plan.toLowerCase();
  });

  const totalCustomers = pagination.total || customers.length;
  const approvedCustomers = customers.filter((customer) => customer.approvalStatus === 'approved').length;
  const pendingCustomers = customers.filter((customer) => customer.approvalStatus === 'pending').length;
  const newThisMonth = customers.filter((customer) => new Date(customer.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
  const recentActivity = customers.slice(0, 5).map((customer, index) => ({
    id: `${customer._id}-${index}`,
    title: customer.approvalStatus === 'pending' ? 'New customer registered' : customer.approvalStatus === 'approved' ? 'Account approved' : 'Customer updated',
    subtitle: customer.companyName || customer.contactName || customer.email,
    time: index === 0 ? 'Just now' : `${index + 1}h ago`,
    icon: index % 4
  }));

  useEffect(() => {
    if (!token) return; // wait until token is available
    fetchCustomers();
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, token, selectedTab, search]);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/super-admin/customers', { params: { page: 1, limit: 200 } });
      const data = res.data || {};
      const companies = Array.isArray(data.companies) ? data.companies : [];
      setCompaniesList(companies);
    } catch (err) {
      // ignore
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 10 };
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();
      if (selectedTab && selectedTab !== 'all') params.role = selectedTab;
      const response = await api.get('/super-admin/users', { params });

      const data = response.data || {};
      // Map users to a customers-like shape for the existing table component
      const users = Array.isArray(data.users) ? data.users : [];
      const mapped = users.map(mapUserToCustomer);

      setCustomers(mapped);
      setPagination(data.pagination ? { page: data.pagination.page || 1, pages: data.pagination.pages || 1, total: data.pagination.total || 0, limit: data.pagination.limit || 10 } : defaultPagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load customers');
      setCustomers([]);
      setPagination(defaultPagination);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (companyId) => {
    if (!window.confirm('Are you sure you want to suspend this company?')) return;
    try {
      await api.post(`/super-admin/customers/${companyId}/suspend`);
      fetchCustomers();
    } catch (err) {
      alert('Error suspending company');
    }
  };

  const handleActivate = async (companyId) => {
    try {
      await api.post(`/super-admin/customers/${companyId}/activate`);
      fetchCustomers();
    } catch (err) {
      alert('Error activating company');
    }
  };

  const onExport = () => {
    // Simple export placeholder; keep backend unchanged.
    alert('Export started. Backend handles the export endpoint.');
  };

  const onAdd = () => {
    // Navigate to add customer flow or open modal placeholder.
    setShowAddModal(true);
  };

  const resetForm = () => setForm({ name: '', email: '', password: '', phone: '', companyId: '', companyName: '', address: '' });

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedTab === 'self_owner') {
        // Register company (self_owner)
        const payload = {
          companyName: form.companyName || `${form.name} Company`,
          ownerName: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          address: form.address,
          role: 'self_owner'
        };
        await api.post('/auth/register-company', payload);
      } else {
        // Register user (super_admin or tenant)
        const payload = {
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          company: form.companyId || undefined,
          role: selectedTab === 'super_admin' ? 'super_admin' : 'tenant'
        };
        await api.post('/auth/register', payload);
      }

      alert('Customer created successfully');
      setShowAddModal(false);
      resetForm();
      fetchCustomers();
      fetchCompanies();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create customer');
    }
  };

  // Action modal state & handlers
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionUser, setActionUser] = useState(null);
  const [actionEditMode, setActionEditMode] = useState(false);
  const [approvalBusy, setApprovalBusy] = useState(false);

  const openActionModal = (user) => {
    setActionUser(user);
    setActionEditMode(false);
    setShowActionModal(true);
  };

  useEffect(() => {
    if (!token) return;

    const params = new URLSearchParams(location.search);
    const approvalUserId = params.get('approvalUser');
    const pendingUserFromSession = window.sessionStorage.getItem('superAdminApprovalUser');

    if (pendingUserFromSession) {
      try {
        const pendingUser = JSON.parse(pendingUserFromSession);
        if (!approvalUserId || pendingUser?._id === approvalUserId) {
          openActionModal(mapUserToCustomer(pendingUser));
          window.sessionStorage.removeItem('superAdminApprovalUser');
          return;
        }
      } catch (error) {
        window.sessionStorage.removeItem('superAdminApprovalUser');
      }
    }

    if (!approvalUserId) return;

    let cancelled = false;

    const openPendingUserFromNotification = async () => {
      try {
        const response = await api.get('/super-admin/pending-users', { params: { page: 1, limit: 100 } });
        if (cancelled) return;

        const pendingUser = (response.data?.users || []).find((item) => item._id === approvalUserId);
        if (pendingUser) {
          openActionModal(mapUserToCustomer(pendingUser));
        }
      } catch (err) {
        alert(err.response?.data?.message || err.message || 'Failed to load pending approval');
      }
    };

    openPendingUserFromNotification();

    return () => {
      cancelled = true;
    };
  }, [location.search, token]);

  const handleUpdateUser = async () => {
    if (!actionUser) return;
    try {
      const payload = {
        name: actionUser.contactName || actionUser.name,
        email: actionUser.email,
        phone: actionUser.phone,
        role: actionUser.role,
        company: actionUser.companyId || undefined,
        approvalStatus: actionUser.approvalStatus
      };
      await api.put(`/super-admin/users/${actionUser._id}`, payload);
      alert('User updated');
      closeActionModal();
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!actionUser) return;
    if (!window.confirm('Delete this user? This will deactivate the account.')) return;
    try {
      await api.delete(`/super-admin/users/${actionUser._id}`);
      alert('User deleted');
      closeActionModal();
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete user');
    }
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setActionUser(null);
    setActionEditMode(false);
    const params = new URLSearchParams(location.search);
    if (params.has('approvalUser')) {
      params.delete('approvalUser');
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  };

  const handleApproveUser = async () => {
    if (!actionUser) return;
    try {
      setApprovalBusy(true);
      await api.post(`/super-admin/users/${actionUser._id}/approve`);
      alert('Account approved');
      window.dispatchEvent(new Event('super-admin-approvals-updated'));
      closeActionModal();
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to approve account');
    } finally {
      setApprovalBusy(false);
    }
  };

  const handleRejectUser = async () => {
    if (!actionUser) return;
    const rejectionReason = window.prompt('Why is this account being rejected?');
    if (!rejectionReason) return;

    try {
      setApprovalBusy(true);
      await api.post(`/super-admin/users/${actionUser._id}/reject`, { rejectionReason });
      alert('Account rejected');
      window.dispatchEvent(new Event('super-admin-approvals-updated'));
      closeActionModal();
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to reject account');
    } finally {
      setApprovalBusy(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Add {selectedTab === 'all' ? 'Customer' : selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)}</h3>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input required value={form.name} onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))} placeholder="Full name" className="p-2 border rounded-md" />
                <input required value={form.email} onChange={(e) => setForm(s => ({ ...s, email: e.target.value }))} placeholder="Email" type="email" className="p-2 border rounded-md" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input required value={form.password} onChange={(e) => setForm(s => ({ ...s, password: e.target.value }))} placeholder="Password" type="password" className="p-2 border rounded-md" />
                <input value={form.phone} onChange={(e) => setForm(s => ({ ...s, phone: e.target.value }))} placeholder="Phone" className="p-2 border rounded-md" />
              </div>

              {(selectedTab === 'self_owner') && (
                <>
                  <input required value={form.companyName} onChange={(e) => setForm(s => ({ ...s, companyName: e.target.value }))} placeholder="Company name" className="p-2 border rounded-md w-full" />
                  <input value={form.address} onChange={(e) => setForm(s => ({ ...s, address: e.target.value }))} placeholder="Address" className="p-2 border rounded-md w-full" />
                </>
              )}

              {(selectedTab === 'tenant' || selectedTab === 'super_admin') && (
                <select value={form.companyId} onChange={(e) => setForm(s => ({ ...s, companyId: e.target.value }))} className="p-2 border rounded-md w-full">
                  <option value="">Select company (optional)</option>
                  {companiesList.map(c => (
                    <option key={c._id} value={c._id}>{c.companyName}</option>
                  ))}
                </select>
              )}

              <div className="flex items-center justify-end gap-2 mt-4">
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="px-4 py-2 rounded-md border">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total Customers" value={totalCustomers} trend="+12.5%" />
        <StatCard icon={CheckCircle2} label="Active Accounts" value={approvedCustomers} color="green" trend="+8.3%" />
        <StatCard icon={Clock3} label="Pending Approval" value={pendingCustomers} color="orange" trend="-4.2%" />
        <StatCard icon={TrendingUp} label="New This Month" value={newThisMonth} color="purple" trend="+14.7%" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <FiltersBar
            search={search}
            setSearch={(value) => { setSearch(value); setPage(1); }}
            status={status}
            setStatus={(value) => { setStatus(value); setPage(1); }}
            plan={plan}
            setPlan={setPlan}
            onExport={onExport}
            onAdd={onAdd}
          />

          <div className="flex flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black tracking-normal text-slate-950">Customer Directory</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">All customer accounts in your system</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'tenant', label: 'Tenants' },
                { key: 'self_owner', label: 'Self Owners' },
                { key: 'super_admin', label: 'Super Admins' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setSelectedTab(tab.key); setPage(1); }}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${selectedTab === tab.key ? 'bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.25)]' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="px-4 pb-4"><LoadingState /></div>
          ) : error ? (
            <div className="px-4 pb-4"><ErrorState message={error} /></div>
          ) : filteredCustomers.length === 0 ? (
            <div className="px-4 pb-4"><EmptyState title="No customers" description="No customers match your filters." /></div>
          ) : (
            <>
              <CustomersTable customers={filteredCustomers} onSuspend={handleSuspend} onActivate={handleActivate} onOpenActions={openActionModal} />
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm font-semibold text-slate-500 md:flex-row md:items-center md:justify-between">
                <span>Showing {filteredCustomers.length ? 1 : 0} to {filteredCustomers.length} of {pagination.total || filteredCustomers.length} results</span>
                <Pagination page={pagination.page} totalPages={pagination.pages} total={pagination.total} limit={pagination.limit} onPage={(p) => setPage(p)} />
              </div>
            </>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black tracking-normal text-slate-950">Recent Activity</h2>
              <button type="button" className="text-sm font-bold text-blue-600 hover:text-blue-700">View all</button>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const palettes = [
                  'bg-green-50 text-green-600',
                  'bg-blue-50 text-blue-600',
                  'bg-orange-50 text-orange-600',
                  'bg-violet-50 text-violet-600'
                ];
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${palettes[activity.icon]}`}>
                      {activity.icon === 0 ? <UserPlus className="h-5 w-5" /> : activity.icon === 1 ? <FileText className="h-5 w-5" /> : activity.icon === 2 ? <BarChart3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{activity.title}</p>
                      <p className="truncate text-sm font-semibold text-slate-500">{activity.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-slate-400">{activity.time}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black tracking-normal text-slate-950">Customer Growth</h2>
              <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">Last 6 Months</button>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-black text-slate-950">+{newThisMonth}</p>
                <p className="text-sm font-semibold text-slate-500">New customers</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">+18.4%</p>
                <p className="text-xs font-semibold text-slate-500">vs previous 6 months</p>
              </div>
            </div>
            <div className="mt-6 h-36">
              <svg viewBox="0 0 320 140" className="h-full w-full" role="img" aria-label="Customer growth chart">
                <defs>
                  <linearGradient id="customerGrowthFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M8 112 C48 96 62 90 92 104 C120 118 132 76 166 72 C194 68 202 88 232 76 C260 64 274 42 312 26 L312 132 L8 132 Z" fill="url(#customerGrowthFill)" />
                <path d="M8 112 C48 96 62 90 92 104 C120 118 132 76 166 72 C194 68 202 88 232 76 C260 64 274 42 312 26" fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
                <circle cx="312" cy="26" r="5" fill="#2563eb" />
              </svg>
            </div>
            <div className="mt-2 flex justify-between text-xs font-bold text-slate-500">
              <span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span>
            </div>
          </section>
        </aside>
      </div>

      {/* Action Modal for update/delete */}
      {showActionModal && actionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">User Details</h3>
              <div className="text-sm text-slate-500">{actionUser.role}</div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={actionUser.contactName || actionUser.name || ''} onChange={(e) => setActionUser(a => ({ ...a, contactName: e.target.value, name: e.target.value }))} className={`p-2 border rounded-md ${!actionEditMode ? 'bg-slate-50' : ''}`} readOnly={!actionEditMode} />
                <input value={actionUser.email || ''} onChange={(e) => setActionUser(a => ({ ...a, email: e.target.value }))} className={`p-2 border rounded-md ${!actionEditMode ? 'bg-slate-50' : ''}`} readOnly={!actionEditMode} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={actionUser.phone || ''} onChange={(e) => setActionUser(a => ({ ...a, phone: e.target.value }))} className={`p-2 border rounded-md ${!actionEditMode ? 'bg-slate-50' : ''}`} readOnly={!actionEditMode} />
                <select value={actionUser.role || ''} onChange={(e) => setActionUser(a => ({ ...a, role: e.target.value }))} disabled={!actionEditMode} className={`p-2 border rounded-md ${!actionEditMode ? 'bg-slate-50' : ''}`}>
                  <option value="super_admin">Super Admin</option>
                  <option value="self_owner">Self Owner</option>
                  <option value="tenant">Tenant</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-600">Company</label>
                <select value={actionUser.company?._id || actionUser.companyId || ''} onChange={(e) => setActionUser(a => ({ ...a, companyId: e.target.value }))} disabled={!actionEditMode} className={`p-2 border rounded-md w-full ${!actionEditMode ? 'bg-slate-50' : ''}`}>
                  <option value="">None</option>
                  {companiesList.map(c => (
                    <option key={c._id} value={c._id}>{c.companyName}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Account approval</p>
                    <p className="text-xs text-slate-600">
                      {actionUser.approvalStatus === 'pending'
                        ? 'This registration is waiting for super admin review.'
                        : 'This account is no longer pending approval.'}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-amber-700">
                    {actionUser.approvalStatus || 'approved'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4">
                <button onClick={closeActionModal} className="px-4 py-2 rounded-md border">Close</button>
                {!actionEditMode ? (
                  <>
                    {actionUser.approvalStatus === 'pending' && (
                      <>
                        <button disabled={approvalBusy} onClick={handleApproveUser} className="px-4 py-2 rounded-md bg-green-600 text-white disabled:opacity-60">Approve account</button>
                        <button disabled={approvalBusy} onClick={handleRejectUser} className="px-4 py-2 rounded-md bg-amber-600 text-white disabled:opacity-60">Reject</button>
                      </>
                    )}
                    <button onClick={() => setActionEditMode(true)} className="px-4 py-2 rounded-md bg-blue-600 text-white">Edit</button>
                    <button onClick={handleDeleteUser} className="px-4 py-2 rounded-md bg-rose-600 text-white">Delete</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setActionEditMode(false)} className="px-4 py-2 rounded-md border">Cancel</button>
                    <button onClick={handleUpdateUser} className="px-4 py-2 rounded-md bg-green-600 text-white">Save</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminCustomers;
