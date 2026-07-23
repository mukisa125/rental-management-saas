import { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, Home, ReceiptText, TrendingUp, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { formatUGX } from '../../utils/currency';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import LoadingState from '../LoadingState';
import ExportButtons from './ExportButtons';
import RentCollectionChart from './RentCollectionChart';
import ReportSummaryPanel from './ReportSummaryPanel';
import ReportTable from './ReportTable';
import ReportTabs from './ReportTabs';
import ReportsFilterBar from './ReportsFilterBar';
import ReportsSummaryCards from './ReportsSummaryCards';
import StatusBadge from './StatusBadge';

const TABS = [
  { value: 'rent_collection', label: 'Rent Collection' },
  { value: 'tenant_balance', label: 'Tenant Balances' },
  { value: 'occupancy', label: 'Occupancy Report' },
  { value: 'property_performance', label: 'Property Performance' },
  { value: 'maintenance_expense', label: 'Maintenance Expenses' },
  { value: 'income_expenses', label: 'Income vs Expenses' },
  { value: 'lease_expiry', label: 'Lease Expiry' },
  { value: 'payment_methods', label: 'Payment Methods' }
];

const STATUS_OPTIONS = [
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'maintenance', label: 'Under Maintenance' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

const PAGE_SIZE = 10;

const asNumber = (value) => Number(value) || 0;
const asDateValue = (value) => (value ? new Date(value) : null);
const formatDate = (value) => {
  const date = asDateValue(value);
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';
};

const getId = (value) => String(value?._id || value || '');

const safeLabel = (value, fallback = '-') => {
  const text = String(value || '').trim();
  return text || fallback;
};

const percent = (value, total) => {
  const numerator = asNumber(value);
  const denominator = asNumber(total);
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
};

const toMonthLabel = (value) => {
  const date = asDateValue(value);
  if (!date || Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-UG', { month: 'short', year: '2-digit' });
};

const inDateRange = (value, startDate, endDate) => {
  const date = asDateValue(value);
  if (!date || Number.isNaN(date.getTime())) return false;

  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};

const fetchAllPages = async (endpoint, key, params = {}) => {
  let page = 1;
  let pages = 1;
  const all = [];

  do {
    const response = await api.get(endpoint, { params: { ...params, page, limit: 100 } });
    const current = Array.isArray(response.data?.[key]) ? response.data[key] : [];
    all.push(...current);
    pages = Math.max(1, asNumber(response.data?.pagination?.pages));
    page += 1;
  } while (page <= pages);

  return all;
};

const getTabLabel = (activeTab) => TABS.find((tab) => tab.value === activeTab)?.label || 'Reports';

const formatCellValue = (row, column) => {
  const key = column?.key || '';
  const raw = row?.[key];
  if (key === 'actions') return '-';
  if (key.toLowerCase().includes('status')) return safeLabel(raw, 'N/A').replace(/_/g, ' ');
  if (key.toLowerCase().includes('date')) return formatDate(raw);
  if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('balance') || key.toLowerCase().includes('rent') || key.toLowerCase().includes('income') || key.toLowerCase().includes('expense') || key.toLowerCase().includes('potential')) return formatUGX(raw);
  if (key.toLowerCase().includes('percentage') || key.toLowerCase().includes('rate')) return `${asNumber(raw)}%`;
  return safeLabel(raw, 'N/A');
};

const buildPrintHtml = ({ title, ownerName, filters, summaryItems, columns, rows }) => {
  const summaryHtml = (summaryItems || [])
    .map((item) => `
      <div class="summary-card">
        <p class="summary-label">${item.label}</p>
        <p class="summary-value">${item.value}</p>
      </div>
    `)
    .join('');

  const headers = (columns || []).map((column) => `<th>${column.label}</th>`).join('');
  const body = (rows || []).length
    ? rows
        .map((row) => `<tr>${(columns || []).map((column) => `<td>${formatCellValue(row, column)}</td>`).join('')}</tr>`)
        .join('')
    : '<tr><td colspan="99">No records found for selected filters.</td></tr>';

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
          body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #0f172a; margin: 0; background: #f8fafc; }
          .page { max-width: 1100px; margin: 0 auto; padding: 20px; }
          .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; }
          .head h1 { margin: 0; font-size: 24px; color: #1d4ed8; }
          .head p { margin: 5px 0; font-size: 12px; color: #475569; }
          .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
          .summary-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; }
          .summary-label { margin: 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; }
          .summary-value { margin: 4px 0 0; font-size: 15px; font-weight: 800; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; background: #fff; }
          th, td { border: 1px solid #e2e8f0; padding: 7px; font-size: 11px; text-align: left; }
          th { background: #f8fafc; font-weight: 800; text-transform: uppercase; }
          @media print {
            body { background: #fff; }
            .page { max-width: none; padding: 0; }
            .card { border: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <section class="card">
            <div class="head">
              <h1>RentProLink - ${title}</h1>
              <p>Self Owner: ${ownerName}</p>
              <p>Date range: ${filters.startDate || '-'} to ${filters.endDate || '-'}</p>
              <p>Generated: ${new Date().toLocaleString('en-UG')}</p>
            </div>
            <div class="summary">${summaryHtml}</div>
            <table>
              <thead><tr>${headers}</tr></thead>
              <tbody>${body}</tbody>
            </table>
            <p style="font-size:11px;color:#64748b;margin-top:10px;">System-generated report from RentProLink.</p>
          </section>
        </div>
      </body>
    </html>
  `;
};

function ReportRowDetailsModal({ details, onClose }) {
  if (!details) return null;

  const columns = (details.columns || []).filter((column) => column.key !== 'actions');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <section className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Report row</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{details.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close report row details"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            {columns.map((column) => (
              <div key={column.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{column.label}</dt>
                <dd className="mt-1 break-words text-sm font-bold leading-6 text-slate-800">
                  {formatCellValue(details.row, column)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <footer className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function SelfOwnerReportsPage() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const [activeTab, setActiveTab] = useState('rent_collection');
  const [filters, setFilters] = useState({
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: today,
    propertyId: '',
    tenantId: '',
    status: '',
    leaseWindow: '30'
  });

  const [paginationPage, setPaginationPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [rowDetails, setRowDetails] = useState(null);

  const applyFilters = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const normalizedData = useMemo(() => {
    const selectedProperty = filters.propertyId;
    const selectedTenant = filters.tenantId;
    const selectedStatus = filters.status;

    const filteredProperties = selectedProperty
      ? properties.filter((property) => getId(property._id) === selectedProperty)
      : properties;

    const filteredUnits = units.filter((unit) => {
      if (selectedProperty && getId(unit.property?._id || unit.property) !== selectedProperty) return false;
      if (selectedStatus && ['occupied', 'vacant', 'maintenance', 'reserved'].includes(selectedStatus) && String(unit.status || '').toLowerCase() !== selectedStatus) return false;
      return true;
    });

    const filteredTenants = tenants.filter((tenant) => {
      if (selectedProperty && getId(tenant.property?._id || tenant.property) !== selectedProperty) return false;
      if (selectedTenant && getId(tenant._id) !== selectedTenant) return false;
      if (selectedStatus && ['active', 'inactive', 'terminated', 'evicted'].includes(selectedStatus) && String(tenant.status || '').toLowerCase() !== selectedStatus) return false;
      return true;
    });

    const filteredPayments = payments.filter((payment) => {
      if (selectedProperty && getId(payment.property?._id || payment.property) !== selectedProperty) return false;
      if (selectedTenant && getId(payment.tenant?._id || payment.tenant) !== selectedTenant) return false;
      if (selectedStatus && ['paid', 'partial', 'pending', 'overdue', 'failed', 'reversed'].includes(selectedStatus) && String(payment.status || '').toLowerCase() !== selectedStatus) return false;
      return true;
    });

    const filteredMaintenance = maintenance.filter((item) => {
      if (selectedProperty && getId(item.property?._id || item.property) !== selectedProperty) return false;
      if (selectedTenant && getId(item.tenant?._id || item.tenant) !== selectedTenant) return false;
      if (selectedStatus && String(item.status || '').toLowerCase() !== selectedStatus) return false;
      if (!inDateRange(item.completedAt || item.submittedDate || item.createdAt, filters.startDate, filters.endDate)) return false;
      return true;
    });

    return {
      properties: filteredProperties,
      units: filteredUnits,
      tenants: filteredTenants,
      payments: filteredPayments,
      maintenance: filteredMaintenance
    };
  }, [filters.endDate, filters.propertyId, filters.startDate, filters.status, filters.tenantId, maintenance, payments, properties, tenants, units]);

  const baseCards = useMemo(() => {
    const occupiedUnits = normalizedData.units.filter((unit) => String(unit.status || '').toLowerCase() === 'occupied').length;
    const totalUnits = normalizedData.units.length;

    const totalCollected = normalizedData.payments
      .filter((payment) => ['paid', 'partial'].includes(String(payment.status || '').toLowerCase()))
      .reduce((sum, payment) => sum + asNumber(payment.amountPaid || payment.amount), 0);

    const outstandingBalance = normalizedData.tenants
      .reduce((sum, tenant) => sum + asNumber(tenant.outstandingBalance), 0);

    const maintenanceCost = normalizedData.maintenance
      .reduce((sum, item) => sum + asNumber(item.actualCost || item.estimatedCost), 0);

    const netIncome = totalCollected - maintenanceCost;

    return [
      {
        icon: CircleDollarSign,
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        label: 'Total Collected',
        value: formatUGX(totalCollected),
        description: 'Paid and partial rent receipts in selected period'
      },
      {
        icon: ReceiptText,
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
        label: 'Outstanding Balance',
        value: formatUGX(outstandingBalance),
        description: 'Current tenant balances and arrears'
      },
      {
        icon: Home,
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        label: 'Occupancy Rate',
        value: percent(occupiedUnits, totalUnits),
        description: `${occupiedUnits} occupied out of ${totalUnits} total units`
      },
      {
        icon: TrendingUp,
        iconBg: 'bg-violet-50',
        iconColor: 'text-violet-600',
        label: 'Net Income',
        value: formatUGX(netIncome),
        description: 'Collected rent minus maintenance expenses'
      }
    ];
  }, [normalizedData.maintenance, normalizedData.payments, normalizedData.tenants, normalizedData.units]);

  const reportModel = useMemo(() => {
    const paymentRows = normalizedData.payments
      .map((payment) => {
        const amount = asNumber(payment.amount || payment.amountPaid);
        const amountPaid = asNumber(payment.amountPaid || payment.amount);
        const balance = Math.max(0, amount - amountPaid);
        return {
          id: getId(payment._id),
          receiptNumber: safeLabel(payment.receiptNumber, '-'),
          tenant: safeLabel(payment.tenant?.fullName, 'Tenant'),
          phone: safeLabel(payment.tenant?.phone, '-'),
          propertyUnit: `${safeLabel(payment.property?.name, 'Property')} / ${safeLabel(payment.unit?.unitNumber, 'Unit')}`,
          paymentFor: safeLabel(payment.paymentFor, '-'),
          amount,
          amountPaid,
          paymentMethod: safeLabel(payment.paymentMethod, '-').replace(/_/g, ' '),
          paymentDate: payment.paidDate || payment.paymentDate || payment.createdAt,
          balance,
          status: safeLabel(payment.status, 'pending').toLowerCase(),
          reference: safeLabel(payment.receiptNumber || payment._id)
        };
      })
      .sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0));

    const monthlyRentCollectionMap = new Map();
    paymentRows.forEach((row) => {
      const key = toMonthLabel(row.paymentDate);
      const current = monthlyRentCollectionMap.get(key) || { month: key, expected: 0, collected: 0 };
      current.expected += asNumber(row.amount);
      current.collected += asNumber(row.amountPaid);
      monthlyRentCollectionMap.set(key, current);
    });
    const rentChartData = Array.from(monthlyRentCollectionMap.values());

    const totalExpectedRent = paymentRows.reduce((sum, row) => sum + asNumber(row.amount), 0);
    const totalCollectedRent = paymentRows.reduce((sum, row) => sum + asNumber(row.amountPaid), 0);
    const totalOutstanding = paymentRows.reduce((sum, row) => sum + asNumber(row.balance), 0);

    const tenantBalanceRows = normalizedData.tenants
      .map((tenant) => {
        const tenantId = getId(tenant._id);
        const tenantPayments = paymentRows.filter((row) => getId(row.id ? row.id : '') && getId(tenant._id) === getId(normalizedData.payments.find((p) => getId(p._id) === row.id)?.tenant?._id || normalizedData.payments.find((p) => getId(p._id) === row.id)?.tenant));
        const amountPaid = tenantPayments.reduce((sum, row) => sum + asNumber(row.amountPaid), 0);
        const balance = Math.max(0, asNumber(tenant.outstandingBalance));
        const overduePayment = normalizedData.payments
          .filter((payment) => getId(payment.tenant?._id || payment.tenant) === tenantId && String(payment.status || '').toLowerCase() === 'overdue')
          .sort((a, b) => new Date(a.dueDate || a.createdAt || 0) - new Date(b.dueDate || b.createdAt || 0))[0];
        const lastPayment = tenantPayments[0]?.paymentDate || null;
        const daysOverdue = overduePayment
          ? Math.max(0, Math.ceil((Date.now() - new Date(overduePayment.dueDate || overduePayment.createdAt).getTime()) / 86400000))
          : 0;

        return {
          id: tenantId,
          tenant: safeLabel(tenant.fullName, 'Tenant'),
          phone: safeLabel(tenant.phone, '-'),
          propertyUnit: `${safeLabel(tenant.property?.name, 'Property')} / ${safeLabel(tenant.unit?.unitNumber, 'Unit')}`,
          monthlyRent: asNumber(tenant.rentAmount),
          amountPaid,
          balance,
          daysOverdue,
          lastPaymentDate: lastPayment,
          status: balance > 0 ? (daysOverdue > 0 ? 'overdue' : 'pending') : 'paid'
        };
      })
      .sort((a, b) => b.balance - a.balance);

    const propertiesMap = new Map(normalizedData.properties.map((property) => [getId(property._id), property]));

    const occupancyRows = Array.from(propertiesMap.values()).map((property) => {
      const propertyUnits = normalizedData.units.filter((unit) => getId(unit.property?._id || unit.property) === getId(property._id));
      const occupied = propertyUnits.filter((unit) => String(unit.status || '').toLowerCase() === 'occupied').length;
      const vacant = propertyUnits.filter((unit) => String(unit.status || '').toLowerCase() === 'vacant').length;
      const maintenanceCount = propertyUnits.filter((unit) => String(unit.status || '').toLowerCase() === 'maintenance').length;
      const totalUnits = propertyUnits.length;
      const potential = propertyUnits.reduce((sum, unit) => sum + asNumber(unit.rentAmount), 0);

      return {
        id: getId(property._id),
        property: safeLabel(property.name, 'Property'),
        totalUnits,
        occupiedUnits: occupied,
        vacantUnits: vacant,
        maintenanceUnits: maintenanceCount,
        occupancyRate: totalUnits ? Math.round((occupied / totalUnits) * 100) : 0,
        monthlyPotential: potential
      };
    });

    const propertyPerformanceRows = Array.from(propertiesMap.values()).map((property) => {
      const propertyId = getId(property._id);
      const propertyUnits = normalizedData.units.filter((unit) => getId(unit.property?._id || unit.property) === propertyId);
      const propertyPayments = paymentRows.filter((row) => {
        const original = normalizedData.payments.find((payment) => getId(payment._id) === row.id);
        return getId(original?.property?._id || original?.property) === propertyId;
      });
      const propertyMaintenance = normalizedData.maintenance.filter((item) => getId(item.property?._id || item.property) === propertyId);

      const expected = propertyUnits.reduce((sum, unit) => sum + asNumber(unit.rentAmount), 0);
      const collected = propertyPayments.reduce((sum, row) => sum + asNumber(row.amountPaid), 0);
      const outstanding = Math.max(0, expected - collected);
      const maintenanceCost = propertyMaintenance.reduce((sum, item) => sum + asNumber(item.actualCost || item.estimatedCost), 0);
      const netIncome = collected - maintenanceCost;
      const occupiedUnits = propertyUnits.filter((unit) => String(unit.status || '').toLowerCase() === 'occupied').length;
      const status = netIncome > 0 && percent(occupiedUnits, propertyUnits.length) !== '0%' ? 'healthy' : netIncome >= 0 ? 'stable' : 'at_risk';

      return {
        id: propertyId,
        propertyName: safeLabel(property.name, 'Property'),
        totalUnits: propertyUnits.length,
        occupiedUnits,
        expected,
        collected,
        outstanding,
        maintenanceCost,
        netIncome,
        status
      };
    });

    const maintenanceRows = normalizedData.maintenance
      .map((item) => ({
        id: getId(item._id),
        requestId: safeLabel(item.requestId, '-'),
        propertyUnit: `${safeLabel(item.property?.name, 'Property')} / ${safeLabel(item.unit?.unitNumber, 'Unit')}`,
        tenant: safeLabel(item.tenant?.fullName, 'Tenant'),
        issueType: safeLabel(item.issueType || item.issue, '-'),
        status: safeLabel(item.status, 'pending').toLowerCase(),
        estimatedCost: asNumber(item.estimatedCost),
        actualCost: asNumber(item.actualCost),
        completedDate: item.completedAt || item.resolvedDate,
        technician: safeLabel(item.technicianName, '-')
      }))
      .sort((a, b) => new Date(b.completedDate || 0) - new Date(a.completedDate || 0));

    const incomeExpenseRowsAsc = [
      ...paymentRows.map((row) => ({
        id: `income-${row.id}`,
        date: row.paymentDate,
        category: 'Rent Income',
        description: `${row.tenant} - ${row.paymentFor}`,
        income: asNumber(row.amountPaid),
        expense: 0,
        reference: row.receiptNumber,
        status: row.status
      })),
      ...maintenanceRows.map((row) => ({
        id: `expense-${row.id}`,
        date: row.completedDate || row.id,
        category: 'Maintenance Expense',
        description: `${row.issueType} - ${row.propertyUnit}`,
        income: 0,
        expense: asNumber(row.actualCost || row.estimatedCost),
        reference: row.requestId,
        status: row.status
      }))
    ]
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
      .map((row, index, all) => {
        const previousBalance = index ? asNumber(all[index - 1].balance) : 0;
        return { ...row, balance: previousBalance + asNumber(row.income) - asNumber(row.expense) };
      });

    const incomeExpenseRows = [...incomeExpenseRowsAsc].reverse();

    const leaseRows = normalizedData.tenants
      .map((tenant) => {
        const leaseEndDate = asDateValue(tenant.leaseEnd);
        const now = new Date();
        const remaining = leaseEndDate ? Math.ceil((leaseEndDate.getTime() - now.getTime()) / 86400000) : 0;
        let status = 'active';
        if (remaining < 0) status = 'expired';
        else if (remaining <= 60) status = 'expiring';

        return {
          id: getId(tenant._id),
          tenant: safeLabel(tenant.fullName, 'Tenant'),
          propertyUnit: `${safeLabel(tenant.property?.name, 'Property')} / ${safeLabel(tenant.unit?.unitNumber, 'Unit')}`,
          leaseStartDate: tenant.leaseStart,
          leaseEndDate: tenant.leaseEnd,
          daysRemaining: remaining,
          monthlyRent: asNumber(tenant.rentAmount),
          status
        };
      })
      .filter((row) => {
        if (filters.leaseWindow === 'expired') return row.daysRemaining < 0;
        const windowDays = asNumber(filters.leaseWindow);
        return row.daysRemaining >= 0 && row.daysRemaining <= windowDays;
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const paymentMethodMap = new Map();
    paymentRows.forEach((row) => {
      const method = String(row.paymentMethod || 'other').toLowerCase();
      const current = paymentMethodMap.get(method) || { method, count: 0, amount: 0, lastDate: null };
      current.count += 1;
      current.amount += asNumber(row.amountPaid);
      const rowDate = asDateValue(row.paymentDate);
      if (!current.lastDate || (rowDate && rowDate > new Date(current.lastDate))) {
        current.lastDate = row.paymentDate;
      }
      paymentMethodMap.set(method, current);
    });

    const totalMethodAmount = Array.from(paymentMethodMap.values()).reduce((sum, item) => sum + asNumber(item.amount), 0);
    const paymentMethodRows = Array.from(paymentMethodMap.values()).map((item) => ({
      id: item.method,
      paymentMethod: item.method.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      numberOfPayments: item.count,
      totalAmount: item.amount,
      percentage: totalMethodAmount ? Math.round((item.amount / totalMethodAmount) * 100) : 0,
      lastPaymentDate: item.lastDate
    }));

    const models = {
      rent_collection: {
        summaryTitle: 'Rent Collection Summary',
        summary: [
          { label: 'Total Expected Rent', value: formatUGX(totalExpectedRent) },
          { label: 'Total Collected', value: formatUGX(totalCollectedRent) },
          { label: 'Collection Rate', value: percent(totalCollectedRent, totalExpectedRent) },
          { label: 'Outstanding Balance', value: formatUGX(totalOutstanding) }
        ],
        chart: {
          title: 'Rent Collection Overview',
          subtitle: 'Expected Rent vs Collected Rent by month',
          data: rentChartData,
          xKey: 'month',
          mode: 'bar',
          series: [
            { key: 'expected', name: 'Expected Rent', color: '#60a5fa' },
            { key: 'collected', name: 'Collected Rent', color: '#16a34a' }
          ]
        },
        columns: [
          { key: 'receiptNumber', label: 'Receipt No' },
          { key: 'tenant', label: 'Tenant' },
          { key: 'propertyUnit', label: 'Property / Unit' },
          { key: 'paymentFor', label: 'Payment For' },
          { key: 'amountPaid', label: 'Amount Paid', align: 'right', render: (row) => formatUGX(row.amountPaid) },
          { key: 'paymentMethod', label: 'Payment Method' },
          { key: 'paymentDate', label: 'Payment Date', render: (row) => formatDate(row.paymentDate) },
          { key: 'balance', label: 'Balance', align: 'right', render: (row) => formatUGX(row.balance) },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
          { key: 'actions', label: 'Actions', actionLabel: 'View' }
        ],
        rows: paymentRows
      },
      tenant_balance: {
        summaryTitle: 'Tenant Balance Summary',
        summary: [
          { label: 'Total Tenants', value: normalizedData.tenants.length },
          { label: 'Tenants With Balance', value: tenantBalanceRows.filter((row) => row.balance > 0).length },
          { label: 'Total Outstanding Balance', value: formatUGX(tenantBalanceRows.reduce((sum, row) => sum + row.balance, 0)) },
          { label: 'Overdue Rent', value: formatUGX(tenantBalanceRows.filter((row) => row.daysOverdue > 0).reduce((sum, row) => sum + row.balance, 0)) }
        ],
        chart: {
          title: 'Tenant Balances vs Monthly Rent',
          subtitle: 'Balance and rent by tenant',
          data: tenantBalanceRows.slice(0, 8).map((row) => ({ month: row.tenant, monthlyRent: row.monthlyRent, balance: row.balance })),
          xKey: 'month',
          mode: 'bar',
          series: [
            { key: 'monthlyRent', name: 'Monthly Rent', color: '#3b82f6' },
            { key: 'balance', name: 'Balance', color: '#f59e0b' }
          ]
        },
        columns: [
          { key: 'tenant', label: 'Tenant' },
          { key: 'phone', label: 'Phone' },
          { key: 'propertyUnit', label: 'Property / Unit' },
          { key: 'monthlyRent', label: 'Monthly Rent', align: 'right', render: (row) => formatUGX(row.monthlyRent) },
          { key: 'amountPaid', label: 'Amount Paid', align: 'right', render: (row) => formatUGX(row.amountPaid) },
          { key: 'balance', label: 'Balance', align: 'right', render: (row) => formatUGX(row.balance) },
          { key: 'daysOverdue', label: 'Days Overdue', align: 'right' },
          { key: 'lastPaymentDate', label: 'Last Payment Date', render: (row) => formatDate(row.lastPaymentDate) },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
          { key: 'actions', label: 'Actions', actionLabel: 'Follow up' }
        ],
        rows: tenantBalanceRows
      },
      occupancy: {
        summaryTitle: 'Occupancy Summary',
        summary: [
          { label: 'Total Units', value: normalizedData.units.length },
          { label: 'Occupied Units', value: normalizedData.units.filter((unit) => String(unit.status || '').toLowerCase() === 'occupied').length },
          { label: 'Vacant Units', value: normalizedData.units.filter((unit) => String(unit.status || '').toLowerCase() === 'vacant').length },
          { label: 'Under Maintenance', value: normalizedData.units.filter((unit) => String(unit.status || '').toLowerCase() === 'maintenance').length },
          { label: 'Occupancy Rate', value: percent(normalizedData.units.filter((unit) => String(unit.status || '').toLowerCase() === 'occupied').length, normalizedData.units.length) }
        ],
        chart: {
          title: 'Occupancy by Property',
          subtitle: 'Occupied vs vacant units',
          data: occupancyRows.map((row) => ({ month: row.property, occupied: row.occupiedUnits, vacant: row.vacantUnits })),
          xKey: 'month',
          mode: 'bar',
          compactNumber: false,
          series: [
            { key: 'occupied', name: 'Occupied', color: '#16a34a' },
            { key: 'vacant', name: 'Vacant', color: '#f59e0b' }
          ]
        },
        columns: [
          { key: 'property', label: 'Property' },
          { key: 'totalUnits', label: 'Total Units', align: 'right' },
          { key: 'occupiedUnits', label: 'Occupied Units', align: 'right' },
          { key: 'vacantUnits', label: 'Vacant Units', align: 'right' },
          { key: 'maintenanceUnits', label: 'Under Maintenance', align: 'right' },
          { key: 'occupancyRate', label: 'Occupancy Rate', align: 'right', render: (row) => `${row.occupancyRate}%` },
          { key: 'monthlyPotential', label: 'Monthly Rent Potential', align: 'right', render: (row) => formatUGX(row.monthlyPotential) },
          { key: 'actions', label: 'Actions', actionLabel: 'View' }
        ],
        rows: occupancyRows
      },
      property_performance: {
        summaryTitle: 'Property Performance Summary',
        summary: [
          { label: 'Properties', value: propertyPerformanceRows.length },
          { label: 'Expected Rent', value: formatUGX(propertyPerformanceRows.reduce((sum, row) => sum + row.expected, 0)) },
          { label: 'Collected Amount', value: formatUGX(propertyPerformanceRows.reduce((sum, row) => sum + row.collected, 0)) },
          { label: 'Net Income', value: formatUGX(propertyPerformanceRows.reduce((sum, row) => sum + row.netIncome, 0)) }
        ],
        chart: {
          title: 'Collected vs Net Income',
          subtitle: 'Property financial performance',
          data: propertyPerformanceRows.map((row) => ({ month: row.propertyName, collected: row.collected, net: row.netIncome })),
          xKey: 'month',
          mode: 'bar',
          series: [
            { key: 'collected', name: 'Collected', color: '#2563eb' },
            { key: 'net', name: 'Net Income', color: '#16a34a' }
          ]
        },
        columns: [
          { key: 'propertyName', label: 'Property Name' },
          { key: 'totalUnits', label: 'Total Units', align: 'right' },
          { key: 'occupiedUnits', label: 'Occupied Units', align: 'right' },
          { key: 'expected', label: 'Monthly Rent Expected', align: 'right', render: (row) => formatUGX(row.expected) },
          { key: 'collected', label: 'Collected Amount', align: 'right', render: (row) => formatUGX(row.collected) },
          { key: 'outstanding', label: 'Outstanding Balance', align: 'right', render: (row) => formatUGX(row.outstanding) },
          { key: 'maintenanceCost', label: 'Maintenance Cost', align: 'right', render: (row) => formatUGX(row.maintenanceCost) },
          { key: 'netIncome', label: 'Net Income', align: 'right', render: (row) => formatUGX(row.netIncome) },
          { key: 'status', label: 'Performance Status', render: (row) => <StatusBadge value={row.status} /> },
          { key: 'actions', label: 'Actions', actionLabel: 'Open' }
        ],
        rows: propertyPerformanceRows
      },
      maintenance_expense: {
        summaryTitle: 'Maintenance Expense Summary',
        summary: [
          { label: 'Total Maintenance Requests', value: maintenanceRows.length },
          { label: 'Completed Repairs', value: maintenanceRows.filter((row) => row.status === 'completed').length },
          { label: 'Pending Repairs', value: maintenanceRows.filter((row) => row.status !== 'completed').length },
          { label: 'Total Maintenance Cost', value: formatUGX(maintenanceRows.reduce((sum, row) => sum + asNumber(row.actualCost || row.estimatedCost), 0)) }
        ],
        chart: {
          title: 'Estimated vs Actual Maintenance Cost',
          subtitle: 'Cost comparison by request',
          data: maintenanceRows.slice(0, 10).map((row) => ({ month: row.requestId, estimated: row.estimatedCost, actual: row.actualCost })),
          xKey: 'month',
          mode: 'line',
          series: [
            { key: 'estimated', name: 'Estimated', color: '#3b82f6' },
            { key: 'actual', name: 'Actual', color: '#f97316' }
          ]
        },
        columns: [
          { key: 'requestId', label: 'Request ID' },
          { key: 'propertyUnit', label: 'Property / Unit' },
          { key: 'tenant', label: 'Tenant' },
          { key: 'issueType', label: 'Issue Type' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
          { key: 'estimatedCost', label: 'Estimated Cost', align: 'right', render: (row) => formatUGX(row.estimatedCost) },
          { key: 'actualCost', label: 'Actual Cost', align: 'right', render: (row) => formatUGX(row.actualCost) },
          { key: 'completedDate', label: 'Date Completed', render: (row) => formatDate(row.completedDate) },
          { key: 'technician', label: 'Technician' },
          { key: 'actions', label: 'Actions', actionLabel: 'Details' }
        ],
        rows: maintenanceRows
      },
      income_expenses: {
        summaryTitle: 'Income vs Expenses Summary',
        summary: [
          { label: 'Total Rent Collected', value: formatUGX(incomeExpenseRows.reduce((sum, row) => sum + asNumber(row.income), 0)) },
          { label: 'Maintenance Expenses', value: formatUGX(incomeExpenseRows.reduce((sum, row) => sum + asNumber(row.expense), 0)) },
          { label: 'Other Expenses', value: formatUGX(0) },
          { label: 'Net Income', value: formatUGX(incomeExpenseRows.reduce((sum, row) => sum + asNumber(row.income) - asNumber(row.expense), 0)) }
        ],
        chart: {
          title: 'Income vs Expenses Trend',
          subtitle: 'Income and expense movement by period',
          data: incomeExpenseRows.slice(0, 10).reverse().map((row) => ({ month: toMonthLabel(row.date), income: row.income, expense: row.expense })),
          xKey: 'month',
          mode: 'line',
          series: [
            { key: 'income', name: 'Income', color: '#16a34a' },
            { key: 'expense', name: 'Expense', color: '#ef4444' }
          ]
        },
        columns: [
          { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
          { key: 'category', label: 'Category' },
          { key: 'description', label: 'Description' },
          { key: 'income', label: 'Income', align: 'right', render: (row) => formatUGX(row.income) },
          { key: 'expense', label: 'Expense', align: 'right', render: (row) => formatUGX(row.expense) },
          { key: 'balance', label: 'Balance', align: 'right', render: (row) => formatUGX(row.balance) },
          { key: 'reference', label: 'Reference' },
          { key: 'actions', label: 'Actions', actionLabel: 'View' }
        ],
        rows: incomeExpenseRows
      },
      lease_expiry: {
        summaryTitle: 'Lease Expiry Summary',
        summary: [
          { label: 'Expiring Leases', value: leaseRows.filter((row) => row.status === 'expiring').length },
          { label: 'Expired Leases', value: leaseRows.filter((row) => row.status === 'expired').length },
          { label: 'Active Leases', value: leaseRows.filter((row) => row.status === 'active').length },
          { label: 'Average Monthly Rent', value: formatUGX(leaseRows.length ? leaseRows.reduce((sum, row) => sum + row.monthlyRent, 0) / leaseRows.length : 0) }
        ],
        chart: {
          title: 'Lease Days Remaining',
          subtitle: 'Days remaining by tenant',
          data: leaseRows.slice(0, 10).map((row) => ({ month: row.tenant, remaining: Math.max(0, row.daysRemaining), rent: row.monthlyRent })),
          xKey: 'month',
          mode: 'bar',
          compactNumber: false,
          series: [
            { key: 'remaining', name: 'Days Remaining', color: '#3b82f6' },
            { key: 'rent', name: 'Monthly Rent', color: '#16a34a' }
          ]
        },
        columns: [
          { key: 'tenant', label: 'Tenant' },
          { key: 'propertyUnit', label: 'Property / Unit' },
          { key: 'leaseStartDate', label: 'Lease Start Date', render: (row) => formatDate(row.leaseStartDate) },
          { key: 'leaseEndDate', label: 'Lease End Date', render: (row) => formatDate(row.leaseEndDate) },
          { key: 'daysRemaining', label: 'Days Remaining', align: 'right', render: (row) => row.daysRemaining },
          { key: 'monthlyRent', label: 'Monthly Rent', align: 'right', render: (row) => formatUGX(row.monthlyRent) },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
          { key: 'actions', label: 'Actions', actionLabel: 'Notify' }
        ],
        rows: leaseRows
      },
      payment_methods: {
        summaryTitle: 'Payment Method Summary',
        summary: [
          { label: 'Total by Mobile Money', value: formatUGX(paymentMethodRows.filter((row) => /mobile money|mtn/i.test(row.paymentMethod)).reduce((sum, row) => sum + row.totalAmount, 0)) },
          { label: 'Total by Cash', value: formatUGX(paymentMethodRows.filter((row) => /cash/i.test(row.paymentMethod)).reduce((sum, row) => sum + row.totalAmount, 0)) },
          { label: 'Total by Bank', value: formatUGX(paymentMethodRows.filter((row) => /bank/i.test(row.paymentMethod)).reduce((sum, row) => sum + row.totalAmount, 0)) },
          { label: 'Total by Airtel', value: formatUGX(paymentMethodRows.filter((row) => /airtel/i.test(row.paymentMethod)).reduce((sum, row) => sum + row.totalAmount, 0)) }
        ],
        chart: {
          title: 'Collections by Payment Method',
          subtitle: 'Payment volume and amount by method',
          data: paymentMethodRows.map((row) => ({ month: row.paymentMethod, amount: row.totalAmount, payments: row.numberOfPayments })),
          xKey: 'month',
          mode: 'bar',
          series: [
            { key: 'amount', name: 'Total Amount', color: '#2563eb' },
            { key: 'payments', name: 'No. of Payments', color: '#16a34a' }
          ]
        },
        columns: [
          { key: 'paymentMethod', label: 'Payment Method' },
          { key: 'numberOfPayments', label: 'Number of Payments', align: 'right' },
          { key: 'totalAmount', label: 'Total Amount', align: 'right', render: (row) => formatUGX(row.totalAmount) },
          { key: 'percentage', label: 'Percentage of Total', align: 'right', render: (row) => `${row.percentage}%` },
          { key: 'lastPaymentDate', label: 'Last Payment Date', render: (row) => formatDate(row.lastPaymentDate) },
          { key: 'actions', label: 'Actions', actionLabel: 'View' }
        ],
        rows: paymentMethodRows
      }
    };

    return models[activeTab] || models.rent_collection;
  }, [activeTab, filters.leaseWindow, normalizedData.maintenance, normalizedData.payments, normalizedData.properties, normalizedData.tenants, normalizedData.units]);

  const generateReport = async () => {
    setGenerating(true);
    setError('');

    try {
      const [propertiesData, unitsData, tenantsData, paymentsData, maintenanceData] = await Promise.all([
        fetchAllPages('/self-owner/properties', 'properties'),
        fetchAllPages('/self-owner/units', 'units', { property: filters.propertyId || undefined }),
        fetchAllPages('/self-owner/tenants', 'tenants'),
        fetchAllPages('/self-owner/payments', 'payments', {
          property: filters.propertyId || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          status: ['paid', 'partial', 'pending', 'overdue', 'failed', 'reversed'].includes(filters.status) ? filters.status : undefined
        }),
        fetchAllPages('/self-owner/maintenance', 'requests', {
          property: filters.propertyId || undefined,
          status: filters.status || undefined
        })
      ]);

      setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      setUnits(Array.isArray(unitsData) ? unitsData : []);
      setTenants(Array.isArray(tenantsData) ? tenantsData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setMaintenance(Array.isArray(maintenanceData) ? maintenanceData : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Failed to generate report data.');
    } finally {
      setLoading(false);
      setGenerating(false);
      setPaginationPage(1);
    }
  };

  useEffect(() => {
    generateReport();
  }, []);

  const exportRows = reportModel.rows || [];
  const exportColumns = (reportModel.columns || []).filter((column) => column.key !== 'actions');
  const exportSummary = reportModel.summary || [];
  const reportTitle = getTabLabel(activeTab);
  const ownerName = user?.name || user?.fullName || user?.company?.companyName || 'Self Owner';

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const generatedAt = new Date().toLocaleString('en-UG');
    const tableRows = exportRows.length
      ? exportRows.map((row) => exportColumns.map((column) => formatCellValue(row, column)))
      : [[`No records found for selected filters.`]];

    doc.setFontSize(16);
    doc.text(`RentProLink - ${reportTitle}`, 40, 40);
    doc.setFontSize(10);
    doc.text(`Self Owner: ${ownerName}`, 40, 58);
    doc.text(`Date range: ${filters.startDate || '-'} to ${filters.endDate || '-'}`, 40, 72);
    doc.text(`Generated: ${generatedAt}`, 40, 86);

    const summaryText = exportSummary.map((item) => `${item.label}: ${item.value}`).join(' | ');
    doc.text(summaryText || 'Summary: No summary data available.', 40, 102);

    autoTable(doc, {
      startY: 118,
      head: [exportRows.length ? exportColumns.map((column) => column.label) : ['Info']],
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      theme: 'grid',
      margin: { left: 24, right: 24 }
    });

    doc.setFontSize(9);
    doc.text('System-generated report from RentProLink.', 40, doc.internal.pageSize.height - 20);

    const dateSuffix = new Date().toISOString().slice(0, 10);
    doc.save(`self-owner-${activeTab}-report-${dateSuffix}.pdf`);
  };

  const handleExportExcel = () => {
    const rowsForSheet = [];
    rowsForSheet.push(['RentProLink Report', reportTitle]);
    rowsForSheet.push(['Self Owner', ownerName]);
    rowsForSheet.push(['Date Range', `${filters.startDate || '-'} to ${filters.endDate || '-'}`]);
    rowsForSheet.push(['Generated', new Date().toLocaleString('en-UG')]);
    rowsForSheet.push([]);
    rowsForSheet.push(['Summary']);

    if (exportSummary.length) {
      exportSummary.forEach((item) => {
        rowsForSheet.push([item.label, item.value]);
      });
    } else {
      rowsForSheet.push(['Summary', 'No summary data available.']);
    }

    rowsForSheet.push([]);
    rowsForSheet.push(exportColumns.map((column) => column.label));

    if (exportRows.length) {
      exportRows.forEach((row) => {
        rowsForSheet.push(exportColumns.map((column) => formatCellValue(row, column)));
      });
    } else {
      rowsForSheet.push(['No records found for selected filters.']);
    }

    const sheet = XLSX.utils.aoa_to_sheet(rowsForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Report');
    const dateSuffix = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `self-owner-${activeTab}-report-${dateSuffix}.xlsx`);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) return;

    const html = buildPrintHtml({
      title: reportTitle,
      ownerName,
      filters,
      summaryItems: exportSummary,
      columns: exportColumns,
      rows: exportRows
    });

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading) {
    return <LoadingState message="Loading report data..." />;
  }

  if (error && !properties.length && !tenants.length && !payments.length && !maintenance.length) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 bg-slate-50">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Analyze rent collection, occupancy, expenses, and property performance
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <ReportsSummaryCards cards={baseCards} />

      <ReportTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          setPaginationPage(1);
          setRowDetails(null);
        }}
      />

      <ReportsFilterBar
        filters={filters}
        properties={properties}
        tenants={tenants}
        statuses={STATUS_OPTIONS}
        activeTab={activeTab}
        onChange={applyFilters}
        onGenerate={generateReport}
        generating={generating}
        exportActions={
          <ExportButtons
            onExportPdf={handleExportPdf}
            onExportExcel={handleExportExcel}
            onPrint={handlePrint}
          />
        }
      />

      <RentCollectionChart
        data={reportModel.chart?.data || []}
        title={reportModel.chart?.title || 'Report Chart'}
        subtitle={reportModel.chart?.subtitle || 'Chart view for selected report'}
        xKey={reportModel.chart?.xKey || 'month'}
        mode={reportModel.chart?.mode || 'bar'}
        series={reportModel.chart?.series || []}
        compactNumber={reportModel.chart?.compactNumber !== false}
      />

      <ReportSummaryPanel
        title={reportModel.summaryTitle || 'Report Summary'}
        items={reportModel.summary || []}
      />

      {(reportModel.rows || []).length ? (
        <ReportTable
          columns={reportModel.columns || []}
          rows={reportModel.rows || []}
          page={paginationPage}
          limit={PAGE_SIZE}
          onPageChange={setPaginationPage}
          onRowAction={(row, actionLabel) => {
            setRowDetails({
              row,
              columns: reportModel.columns || [],
              actionLabel,
              title: `${actionLabel} ${reportTitle}`
            });
          }}
        />
      ) : (
        <EmptyState title="No records found" description="No records found for this tab and filter combination." />
      )}

      <ReportRowDetailsModal details={rowDetails} onClose={() => setRowDetails(null)} />
    </div>
  );
}
