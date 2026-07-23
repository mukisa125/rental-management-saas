import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import api from '../../services/api';
import { formatUGX } from '../../utils/currency';
import { showToast } from '../../utils/toast';

const FALLBACK_ENDPOINTS = {
  '/super-admin/property-seekers': '/super-admin/property_seekers',
  '/super-admin/vacant-listings': '/super-admin/vacant-units',
  '/super-admin/views-visits': '/super-admin/views-and-visits',
  '/super-admin/billing': '/super-admin/billings'
};

const formatCell = (value, type = 'text') => {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (type === 'currency') return formatUGX(Number(value) || 0);
  if (type === 'date') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString();
  }
  if (type === 'number') return Number(value).toLocaleString();
  return String(value);
};

const SuperAdminTablePage = ({
  endpoint,
  dataKey,
  title,
  subtitle,
  columns,
  query = {},
  enableUserActions = false,
  userIdKey = 'id',
  enableFilters = true,
  searchPlaceholder = 'Search records...',
  statusLabel = 'Status',
  statusField = 'status',
  statusOptions = [],
  secondaryLabel = '',
  secondaryField = '',
  secondaryOptions = [],
  enableApprovalActions = false,
  approvalField = 'approvalStatus',
  approveOnActivate = false,
  toolbarActions = null,
  refreshKey = 0
}) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedRow, setSelectedRow] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [secondaryFilter, setSecondaryFilter] = useState('');

  const queryString = useMemo(() => JSON.stringify(query || {}), [query]);

  useEffect(() => {
    const fetchRows = async () => {
      try {
        setLoading(true);
        setError('');
        let response;
        try {
          response = await api.get(endpoint, { params: JSON.parse(queryString || '{}') });
        } catch (primaryError) {
          const fallbackEndpoint = FALLBACK_ENDPOINTS[endpoint];
          if (primaryError?.response?.status === 404 && fallbackEndpoint) {
            response = await api.get(fallbackEndpoint, { params: JSON.parse(queryString || '{}') });
          } else {
            throw primaryError;
          }
        }
        const payload = response.data || {};
        setRows(Array.isArray(payload[dataKey]) ? payload[dataKey] : []);
        setPagination(payload.pagination || { page: 1, pages: 1, total: 0 });
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, [endpoint, dataKey, queryString, refreshKey]);

  const resolveUserId = (row) => row?.[userIdKey] || row?.id || null;

  const normalizedStatusOptions = useMemo(() => {
    if (Array.isArray(statusOptions) && statusOptions.length > 0) {
      return statusOptions;
    }
    const values = [...new Set(rows.map((row) => row?.[statusField]).filter(Boolean).map((value) => String(value)))];
    return values.map((value) => ({ label: value, value }));
  }, [rows, statusField, statusOptions]);

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !search || columns.some((column) => {
        const value = row?.[column.key];
        return String(value ?? '').toLowerCase().includes(search);
      });
      const matchesStatus = !statusFilter || String(row?.[statusField] ?? '').toLowerCase() === String(statusFilter).toLowerCase();
      const matchesSecondary = !secondaryFilter
        || !secondaryField
        || String(row?.[secondaryField] ?? '').toLowerCase() === String(secondaryFilter).toLowerCase();
      return matchesSearch && matchesStatus && matchesSecondary;
    });
  }, [rows, columns, searchTerm, statusFilter, statusField, secondaryFilter, secondaryField]);

  const refreshRows = async () => {
    try {
      setLoading(true);
      setError('');
      let response;
      try {
        response = await api.get(endpoint, { params: JSON.parse(queryString || '{}') });
      } catch (primaryError) {
        const fallbackEndpoint = FALLBACK_ENDPOINTS[endpoint];
        if (primaryError?.response?.status === 404 && fallbackEndpoint) {
          response = await api.get(fallbackEndpoint, { params: JSON.parse(queryString || '{}') });
        } else {
          throw primaryError;
        }
      }
      const payload = response.data || {};
      setRows(Array.isArray(payload[dataKey]) ? payload[dataKey] : []);
      setPagination(payload.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getRowApprovalStatus = (row) => String(row?.[approvalField] ?? '').toLowerCase();

  const approveSystemUser = async ({ silentSuccess = false } = {}) => {
    if (!selectedRow) return false;
    const userId = resolveUserId(selectedRow);
    if (!userId) {
      showToast('No linked system user for this row', 'error');
      return false;
    }

    try {
      await api.post(`/super-admin/users/${userId}/approve`);
      setSelectedRow((prev) => (prev ? { ...prev, [approvalField]: 'approved' } : prev));
      if (!silentSuccess) {
        showToast('Account approved successfully', 'success');
      }
      return true;
    } catch (err) {
      if (err?.response?.status === 400) {
        setSelectedRow((prev) => (prev ? { ...prev, [approvalField]: 'approved' } : prev));
        if (!silentSuccess) {
          showToast('Account is already approved', 'success');
        }
        return true;
      }

      showToast(err.response?.data?.message || 'Failed to approve account', 'error');
      return false;
    }
  };

  const applyUserStatus = async (isActive) => {
    if (!selectedRow) return;
    const userId = resolveUserId(selectedRow);
    if (!userId) {
      showToast('No linked system user for this row', 'error');
      return;
    }
    try {
      setActionLoading(true);

      if (isActive && approveOnActivate && getRowApprovalStatus(selectedRow) === 'pending') {
        const approved = await approveSystemUser({ silentSuccess: true });
        if (!approved) {
          return;
        }
      }

      await api.put(`/super-admin/users/${userId}`, { isActive });
      showToast('Settings saved successfully', 'success');
      setSelectedRow((prev) => (prev ? { ...prev, status: isActive ? 'Active' : 'Suspended' } : prev));
      await refreshRows();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update user status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteSystemUser = async () => {
    if (!selectedRow) return;
    const userId = resolveUserId(selectedRow);
    if (!userId) {
      showToast('No linked system user for this row', 'error');
      return;
    }
    try {
      setActionLoading(true);
      await api.delete(`/super-admin/users/${userId}`);
      showToast('Settings saved successfully', 'success');
      setSelectedRow(null);
      await refreshRows();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete system user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 sa-fade-in">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sa-card-pop">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      {enableFilters ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="relative flex-1 min-w-[240px]">
              <label className="mb-1 block text-xs font-semibold text-slate-500">Search</label>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <Search className="absolute left-3 bottom-3 h-4 w-4 text-slate-400" />
            </div>

            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-semibold text-slate-500">{statusLabel}</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All</option>
                {normalizedStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {secondaryField && secondaryOptions.length > 0 ? (
              <div className="min-w-[200px]">
                <label className="mb-1 block text-xs font-semibold text-slate-500">{secondaryLabel || 'Filter'}</label>
                <select
                  value={secondaryFilter}
                  onChange={(event) => setSecondaryFilter(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All</option>
                  {secondaryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="flex items-center gap-2 lg:ml-auto">
              {toolbarActions}
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setSecondaryFilter('');
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No records found</div>
        ) : (
          <div className="responsive-table overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className="px-4 py-3 font-semibold whitespace-nowrap">
                      {column.label}
                    </th>
                  ))}
                  {enableUserActions ? (
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.id || row._id} className="hover:bg-blue-50/40">
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {formatCell(row[column.key], column.type)}
                      </td>
                    ))}
                    {enableUserActions ? (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedRow(row)}
                          className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500">
        Page {pagination.page || 1} of {pagination.pages || 1} - Showing {filteredRows.length} of {pagination.total || rows.length}
      </div>

      {selectedRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl max-h-[88vh] rounded-xl border border-slate-200 bg-white shadow-xl sa-modal-pop overflow-hidden">
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">User Details</h3>
                <p className="text-sm text-slate-500">Review and manage this system user</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[56vh]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {columns.map((column) => (
                <div key={column.key} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-500">{column.label}</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{formatCell(selectedRow[column.key], column.type)}</p>
                </div>
              ))}
              </div>
            </div>

            {enableUserActions ? (
              <div className="p-5 border-t border-slate-100 flex flex-wrap items-center gap-2 bg-slate-50/70">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => applyUserStatus(true)}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Activate User
                </button>
                {enableApprovalActions && getRowApprovalStatus(selectedRow) === 'pending' ? (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={async () => {
                      setActionLoading(true);
                      const approved = await approveSystemUser();
                      if (approved) {
                        await refreshRows();
                      }
                      setActionLoading(false);
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Approve Account
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => applyUserStatus(false)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Deactivate User
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={deleteSystemUser}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Delete System User
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SuperAdminTablePage;
