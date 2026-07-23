import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Download,
  Send,
  Edit,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Share2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Printer,
  Check,
  X
} from 'lucide-react';
import api from '../../services/api';
import { formatUGX } from '../../utils/currency';
import InvoiceSummaryCards from '../../components/invoices/InvoiceSummaryCards';
import InvoiceFilters from '../../components/invoices/InvoiceFilters';
import InvoiceTable from '../../components/invoices/InvoiceTable';
import GenerateInvoiceModal from '../../components/invoices/GenerateInvoiceModal';
import GenerateMonthlyInvoicesModal from '../../components/invoices/GenerateMonthlyInvoicesModal';
import InvoicePreview from '../../components/invoices/InvoicePreview';

const defaultFilters = {
  search: '',
  property: '',
  billingMonth: '',
  status: '',
  startDate: '',
  endDate: ''
};

const invoiceStatuses = ['paid', 'unpaid', 'partial', 'overdue', 'draft', 'cancelled'];
const statusColors = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
  partial: 'bg-orange-50 text-orange-700 border-orange-200',
  overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  draft: 'bg-slate-50 text-slate-700 border-slate-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-300'
};

const statusIcons = {
  paid: CheckCircle2,
  unpaid: Clock,
  partial: AlertTriangle,
  overdue: AlertCircle,
  draft: FileText,
  cancelled: XCircle
};

const messageFrom = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const normalizeInvoiceHeader = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || normalized === 'rent receipt' || normalized === 'rent invoice') {
    return 'Invoice';
  }
  return String(value).trim();
};

const formatPaidMonths = (invoice) => {
  const periodMonth = Number(invoice?.paymentPeriod?.month);
  const periodYear = Number(invoice?.paymentPeriod?.year);
  if (Number.isFinite(periodMonth) && periodMonth >= 1 && periodMonth <= 12 && Number.isFinite(periodYear) && periodYear > 1900) {
    return new Date(periodYear, periodMonth - 1, 1).toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
  }
  const paymentFor = String(invoice?.paymentFor || '').trim();
  if (paymentFor) return paymentFor;
  const fallbackDate = invoice?.dueDate || invoice?.createdAt;
  if (fallbackDate) return new Date(fallbackDate).toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
  return 'N/A';
};

const formatCoverage = (invoice) => {
  const monthlyRent = Number(invoice?.monthlyRent || 0);
  const baseAmount = Number(invoice?.status === 'paid' ? invoice?.amountPaid : invoice?.amount || 0);
  if (!monthlyRent || !Number.isFinite(monthlyRent) || monthlyRent <= 0) return 'N/A';
  const monthsCovered = baseAmount / monthlyRent;
  if (!Number.isFinite(monthsCovered) || monthsCovered <= 0) return 'N/A';
  return `${monthsCovered.toFixed(monthsCovered % 1 === 0 ? 0 : 2)} month(s)`;
};

export default function SelfOwnerInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState(null);
  const [generateInvoiceOpen, setGenerateInvoiceOpen] = useState(false);
  const [generateMonthlyOpen, setGenerateMonthlyOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareInvoice, setShareInvoice] = useState(null);
  const [invoiceTemplate, setInvoiceTemplate] = useState({
    businessName: 'RentProLink',
    businessLogo: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    receiptFooterMessage: 'Thank you for your business. Please settle outstanding balance by due date.',
    showQrVerificationCode: false,
    showOwnerContactOnReceipt: true,
    showBalanceOnReceipt: true,
    showSignatureOnReceipt: false,
    invoicePrefix: 'INV',
    receiptHeaderName: 'Invoice'
  });
  const deferredSearch = useDeferredValue(filters.search);

  const loadSupportingData = useCallback(async () => {
    try {
      const [summaryResponse, propertiesResponse, tenantsResponse, settingsResponse] = await Promise.all([
        api.get('/self-owner/payments/summary'),
        api.get('/self-owner/properties', { params: { page: 1, limit: 100 } }),
        api.get('/self-owner/tenants', { params: { page: 1, limit: 100, status: 'active' } }),
        api.get('/self-owner/settings')
      ]);
      setSummary(summaryResponse.data?.summary || {});
      setProperties(Array.isArray(propertiesResponse.data?.properties) ? propertiesResponse.data.properties : []);
      setTenants(Array.isArray(tenantsResponse.data?.tenants) ? tenantsResponse.data.tenants : []);
      const settings = settingsResponse?.data?.settings || {};
      const business = settings.business || {};
      const receipts = settings.receiptsInvoices || {};
      setInvoiceTemplate({
        businessName: business.businessName || 'RentProLink',
        businessLogo: business.logo || '',
        businessAddress: business.address || '',
        businessPhone: business.phone || '',
        businessEmail: business.email || '',
        receiptFooterMessage: receipts.receiptFooterMessage || 'Thank you for your business. Please settle outstanding balance by due date.',
        showQrVerificationCode: Boolean(receipts.showQrVerificationCode),
        showOwnerContactOnReceipt: receipts.showOwnerContactOnReceipt !== false,
        showBalanceOnReceipt: receipts.showBalanceOnReceipt !== false,
        showSignatureOnReceipt: Boolean(receipts.showSignatureOnReceipt),
        invoicePrefix: receipts.invoicePrefix || 'INV',
        receiptHeaderName: normalizeInvoiceHeader(receipts.receiptHeaderName)
      });
    } catch (error) {
      setPageError(messageFrom(error, 'Unable to load supporting data.'));
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const params = { page, limit: rowsPerPage };
      if (deferredSearch) params.search = deferredSearch;
      if (filters.property) params.property = filters.property;
      if (filters.billingMonth) params.billingMonth = filters.billingMonth;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      let url = '/self-owner/payments';
      if (activeTab !== 'all') {
        if (activeTab === 'unpaid') {
          params.status = 'pending';
        } else if (activeTab === 'recurring') {
          params.isRecurring = true;
        } else {
          params.status = activeTab;
        }
      }

      const response = await api.get(url, { params });
      setInvoices(Array.isArray(response.data?.payments) ? response.data.payments : []);
      setPagination(response.data?.pagination || { page: 1, limit: rowsPerPage, total: 0, pages: 1 });
    } catch (error) {
      setInvoices([]);
      setPageError(messageFrom(error, 'Invoices could not be loaded right now.'));
    } finally {
      setLoading(false);
    }
  }, [deferredSearch, filters, page, rowsPerPage, activeTab]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadSupportingData().catch((error) =>
        setPageError(messageFrom(error, 'Setup data could not be loaded.'))
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSupportingData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadInvoices();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadInvoices]);

  const refresh = async () => {
    await Promise.all([loadInvoices(), loadSupportingData()]);
  };

  const updateFilters = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
  };

  const handleGenerateInvoice = async (invoiceData) => {
    setSaving(true);
    try {
      await api.post('/self-owner/invoices', invoiceData);
      setNotice({ type: 'success', text: 'Invoice created successfully!' });
      setGenerateInvoiceOpen(false);
      await refresh();
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error, 'Failed to create invoice.') });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateMonthly = async (monthlyData) => {
    setSaving(true);
    try {
      await api.post('/self-owner/invoices/monthly', monthlyData);
      setNotice({ type: 'success', text: 'Monthly invoices generated successfully!' });
      setGenerateMonthlyOpen(false);
      await refresh();
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error, 'Failed to generate invoices.') });
    } finally {
      setSaving(false);
    }
  };

  const openPreview = async (invoice) => {
    try {
      const response = await api.get(`/self-owner/payments/${invoice._id}`);
      setPreviewInvoice(response.data?.payment || invoice);
      setPreviewOpen(true);
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error, 'Failed to load invoice.') });
    }
  };

  const handleRecordPayment = async (invoiceId, amount) => {
    setSaving(true);
    try {
      await api.post(`/self-owner/payments/${invoiceId}/record-payment`, { amount });
      setNotice({ type: 'success', text: 'Payment recorded successfully!' });
      setPreviewOpen(false);
      await refresh();
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error, 'Failed to record payment.') });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = (invoice) => {
    const printWindow = window.open('', '_blank');
    const invoiceHTML = generateInvoiceHTML(invoice);
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const handleShareInvoice = (invoice) => {
    setShareInvoice(invoice);
  };

  const invoiceShareUrl = shareInvoice
    ? `${window.location.origin}/api/self-owner/payments/verify/${encodeURIComponent(shareInvoice.receiptNumber || `${invoiceTemplate.invoicePrefix || 'INV'}-${String(shareInvoice._id || '').slice(-6).toUpperCase()}`)}`
    : '';

  const copyShareLink = async () => {
    if (!invoiceShareUrl) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.');
      await navigator.clipboard.writeText(invoiceShareUrl);
      setNotice({ type: 'success', text: 'Settings saved successfully' });
    } catch {
      setNotice({ type: 'error', text: 'Unable to copy invoice link.' });
    }
  };

  const shareFromDialog = async () => {
    if (!invoiceShareUrl) return;
    if (!navigator.share) {
      await copyShareLink();
      return;
    }
    try {
      await navigator.share({ title: 'Invoice', text: 'Invoice verification link', url: invoiceShareUrl });
      setNotice({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      if (error?.name !== 'AbortError') setNotice({ type: 'error', text: 'Unable to share invoice link.' });
    }
  };

  const generateInvoiceHTML = (invoice) => {
    const tenantInfo = invoice.tenant || {};
    const propertyInfo = invoice.property || {};
    const unitInfo = invoice.unit || {};
    const ownerInfo = invoice.owner || {};
    const totalDue =
      (invoice.amount || 0) +
      (invoice.previousBalance || 0) +
      (invoice.penalties || 0) -
      (invoice.discount || 0);
    const balance = Math.max(0, (invoice.amount || 0) - (invoice.amountPaid || 0));

    const docNumber = invoice.receiptNumber || `${invoiceTemplate.invoicePrefix || 'INV'}-${String(invoice._id || '').slice(-6).toUpperCase()}`;
    const verificationUrl = `${window.location.origin}/api/self-owner/payments/verify/${encodeURIComponent(docNumber)}`;
    const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verificationUrl)}`;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${docNumber}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 22px; color: #0f172a; background: #f8fafc; }
            .paper { max-width: 900px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; overflow: hidden; }
            .header { text-align: center; margin: 0; border-bottom: 1px solid #e2e8f0; padding: 24px; background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%); }
            .header h1 { color: #2563eb; margin: 0; font-size: 34px; letter-spacing: -0.02em; font-weight: 900; }
            .header p { margin: 6px 0 0; color: #475569; font-size: 14px; font-weight: 600; }
            .content { padding: 22px; }
            .invoice-info { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
            .invoice-details { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #ffffff; }
            .invoice-details h3 { margin: 0 0 10px 0; color: #334155; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
            .invoice-details p { margin: 4px 0; font-size: 13px; }
            table { width: 100%; margin: 16px 0; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
            thead { background-color: #f8fafc; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            tbody tr:last-child td { border-bottom: 0; }
            th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #334155; }
            .total-section { display: flex; justify-content: flex-end; margin-bottom: 16px; }
            .total-table { width: 340px; border: 1px solid #dbeafe; border-radius: 12px; overflow: hidden; }
            .total-table tr { background: #ffffff; }
            .total-table tr:last-child { background-color: #eff6ff; color: #1e3a8a; font-weight: 800; }
            .total-table .label { text-align: right; padding-right: 20px; font-weight: 600; color: #475569; }
            .total-table .amount { text-align: right; font-weight: 800; color: #0f172a; }
            .notes { margin: 18px 0; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #f8fafc; }
            .footer { text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; margin-top: 18px; padding-top: 14px; }
            .status { font-weight: 800; }
            .status.paid { color: #059669; }
            .status.overdue { color: #e11d48; }
            .status.pending { color: #d97706; }
            @media print {
              @page { size: A4; margin: 10mm; }
              body { padding: 0; background: #fff; }
              .paper { max-width: none; border: 0; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <article class="paper">
            <div class="header">
              <h1>${normalizeInvoiceHeader(invoiceTemplate.receiptHeaderName) || 'Invoice'}</h1>
              <p>${invoiceTemplate.businessName || 'RentProLink Property Management System'}</p>
              ${invoiceTemplate.businessAddress ? `<p>${invoiceTemplate.businessAddress}</p>` : ''}
              ${(invoiceTemplate.showOwnerContactOnReceipt && (invoiceTemplate.businessPhone || invoiceTemplate.businessEmail)) ? `<p>${invoiceTemplate.businessPhone || ''} ${invoiceTemplate.businessEmail ? `· ${invoiceTemplate.businessEmail}` : ''}</p>` : ''}
              ${invoiceTemplate.businessLogo ? `<img src="${invoiceTemplate.businessLogo}" alt="Business logo" style="width:56px;height:56px;border-radius:8px;border:1px solid #e2e8f0;object-fit:cover;margin-top:8px;" />` : ''}
            </div>

            <div class="content">
              <div class="invoice-info">
                <div class="invoice-details">
                  <h3>Invoice Details</h3>
                  <p><strong>Invoice No:</strong> ${docNumber}</p>
                  <p><strong>Issue Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-UG')}</p>
                  <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-UG')}</p>
                  <p><strong>Status:</strong> <span class="status ${
                    invoice.status === 'paid'
                      ? 'paid'
                      : invoice.status === 'overdue'
                      ? 'overdue'
                      : 'pending'
                  }">${invoice.status?.toUpperCase() || 'PENDING'}</span></p>
                  <p><strong>Month Paid:</strong> ${formatPaidMonths(invoice)}</p>
                  <p><strong>Coverage:</strong> ${formatCoverage(invoice)}</p>
                </div>
                <div class="invoice-details">
                  <h3>Tenant Information</h3>
                  <p><strong>Name:</strong> ${tenantInfo.fullName || 'N/A'}</p>
                  <p><strong>Phone:</strong> ${tenantInfo.phone || 'N/A'}</p>
                  <p><strong>Email:</strong> ${tenantInfo.email || 'N/A'}</p>
                </div>
              </div>

              <div class="invoice-info">
                <div class="invoice-details">
                  <h3>Property and Unit</h3>
                  <p><strong>Property:</strong> ${propertyInfo.name || 'N/A'}</p>
                  <p><strong>Unit:</strong> ${unitInfo.unitNumber || 'N/A'}</p>
                </div>
                <div class="invoice-details">
                  <h3>Prepared By</h3>
                  <p><strong>Owner:</strong> ${ownerInfo.name || 'Self Owner'}</p>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Amount (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Rent Amount (${formatPaidMonths(invoice)})</td>
                    <td style="text-align: right;">${formatUGX(invoice.amount || 0)}</td>
                  </tr>
                  ${
                    invoice.previousBalance
                      ? `<tr><td>Previous Balance</td><td style="text-align: right;">${formatUGX(invoice.previousBalance)}</td></tr>`
                      : ''
                  }
                  ${
                    invoice.penalties
                      ? `<tr><td>Late Fee</td><td style="text-align: right; color: #e11d48;">${formatUGX(invoice.penalties)}</td></tr>`
                      : ''
                  }
                  ${
                    invoice.discount
                      ? `<tr><td>Discount</td><td style="text-align: right; color: #059669;">-${formatUGX(invoice.discount)}</td></tr>`
                      : ''
                  }
                </tbody>
              </table>

              <div class="total-section">
                <table class="total-table">
                  <tr>
                    <td class="label">Total Due:</td>
                    <td class="amount">${formatUGX(totalDue)}</td>
                  </tr>
                  <tr>
                    <td class="label">Amount Paid:</td>
                    <td class="amount">${formatUGX(invoice.amountPaid || 0)}</td>
                  </tr>
                  ${invoiceTemplate.showBalanceOnReceipt ? `<tr><td class="label">Balance:</td><td class="amount">${formatUGX(balance)}</td></tr>` : ''}
                </table>
              </div>
              ${invoiceTemplate.showQrVerificationCode ? `<div style="display:flex;align-items:center;gap:10px;margin:10px 0 0;">
                <img src="${qrImage}" alt="Verification QR" width="86" height="86" />
                <div style="font-size:12px;color:#64748b;"><p style="margin:0 0 3px;"><strong>Verification QR</strong></p><p style="margin:0;">${verificationUrl}</p></div>
              </div>` : ''}
              ${invoiceTemplate.showSignatureOnReceipt ? '<p style="margin:10px 0 0;font-size:12px;color:#64748b;">Authorized Signature: ____________________</p>' : ''}

              ${invoice.notes ? `<div class="notes"><h3 style="margin:0 0 8px; color:#334155; text-transform:uppercase; font-size:12px; letter-spacing:0.06em;">Notes</h3><p style="margin:0; font-size:13px; color:#334155;">${invoice.notes}</p></div>` : ''}

              <div class="footer">
                <p>${invoiceTemplate.receiptFooterMessage || 'Thank you for your business. Please settle the outstanding balance by the due date.'}</p>
                <p>Generated on ${new Date().toLocaleDateString('en-UG')}</p>
              </div>
            </div>
          </article>
        </body>
      </html>
    `;
  };

  const tabs = [
    { id: 'all', label: 'All Invoices', count: summary.totalInvoiced || 0 },
    { id: 'unpaid', label: 'Unpaid', count: summary.unpaidInvoices || 0 },
    { id: 'overdue', label: 'Overdue', count: summary.overdueInvoices || 0 },
    { id: 'paid', label: 'Paid', count: summary.paidInvoices || 0 },
    { id: 'draft', label: 'Drafts', count: 0 },
    { id: 'recurring', label: 'Recurring Rent', count: 0 }
  ];

  if (pageError && !loading) {
    return (
      <div className="mx-auto max-w-[1480px] space-y-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {pageError}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1480px] space-y-5">
      {/* Summary Cards */}
      {!loading && <InvoiceSummaryCards summary={summary} />}

      {/* Filters and Actions */}
      <div className="space-y-4">
        <InvoiceFilters
          filters={filters}
          onFilterChange={updateFilters}
          properties={properties}
          onGenerateInvoice={() => setGenerateInvoiceOpen(true)}
          onGenerateMonthly={() => setGenerateMonthlyOpen(true)}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`py-3 px-1 font-semibold text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Table */}
      {loading && !invoices.length ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <p className="text-sm font-semibold text-slate-600">No invoices found</p>
          <p className="mt-1 text-xs text-slate-500">
            {activeTab === 'all'
              ? 'Create your first invoice to get started.'
              : `No ${activeTab} invoices at this time.`}
          </p>
        </div>
      ) : (
        <>
          <InvoiceTable
            invoices={invoices}
            onViewInvoice={openPreview}
            onPrintInvoice={handlePrint}
            onShareInvoice={handleShareInvoice}
            statusColors={statusColors}
            statusIcons={statusIcons}
          />

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-white rounded-b-2xl p-4">
              <p className="text-xs font-medium text-slate-600">
                Showing {(page - 1) * rowsPerPage + 1} to{' '}
                {Math.min(page * rowsPerPage, pagination.total)} of {pagination.total} invoices
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                  disabled={page === pagination.pages}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {generateInvoiceOpen && (
        <GenerateInvoiceModal
          isOpen={generateInvoiceOpen}
          onClose={() => setGenerateInvoiceOpen(false)}
          onSubmit={handleGenerateInvoice}
          tenants={tenants}
          properties={properties}
          loading={saving}
        />
      )}

      {generateMonthlyOpen && (
        <GenerateMonthlyInvoicesModal
          isOpen={generateMonthlyOpen}
          onClose={() => setGenerateMonthlyOpen(false)}
          onSubmit={handleGenerateMonthly}
          properties={properties}
          loading={saving}
        />
      )}

      {previewOpen && previewInvoice && (
        <InvoicePreview
          invoice={previewInvoice}
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          onRecordPayment={handleRecordPayment}
          onPrint={() => handlePrint(previewInvoice)}
          loading={saving}
        />
      )}

      {shareInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Share invoice</h3>
              <button onClick={() => setShareInvoice(null)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-3 text-sm text-slate-600">Invoice: <span className="font-semibold text-slate-900">{shareInvoice.receiptNumber || 'Draft'}</span></p>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <input readOnly value={invoiceShareUrl} className="min-w-0 flex-1 bg-transparent px-2 py-1 text-xs text-slate-600 outline-none" />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={copyShareLink} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Copy className="h-4 w-4" />Copy Link</button>
              <button onClick={shareFromDialog} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Share2 className="h-4 w-4" />Share</button>
            </div>
          </div>
        </div>
      )}

      {/* Notice */}
      {notice && (
        <div
          className={`fixed bottom-4 right-4 rounded-lg px-4 py-3 text-sm font-semibold flex items-center gap-3 ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {notice.text}
          <button
            onClick={() => setNotice(null)}
            className="ml-auto text-lg font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
