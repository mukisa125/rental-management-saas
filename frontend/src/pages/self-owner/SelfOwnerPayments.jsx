import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import api from '../../services/api';
import PaymentFilters from '../../components/payments/PaymentFilters';
import PaymentSummaryCards from '../../components/payments/PaymentSummaryCards';
import PaymentsTable from '../../components/payments/PaymentsTable';
import ReceiptModal from '../../components/payments/ReceiptModal';
import RecordPaymentModal from '../../components/payments/RecordPaymentModal';

const defaultFilters = { search: '', property: '', paymentMethod: '', status: '', startDate: '', endDate: '' };

const messageFrom = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const noticeStyles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700'
};

const SelfOwnerPayments = () => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState(null);
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const deferredSearch = useDeferredValue(filters.search);

  const loadSupportingData = useCallback(async () => {
    const [summaryResponse, tenantsResponse, propertiesResponse] = await Promise.all([
      api.get('/self-owner/payments/summary'),
      api.get('/self-owner/tenants', { params: { page: 1, limit: 100, status: 'active' } }),
      api.get('/self-owner/properties', { params: { page: 1, limit: 100 } })
    ]);
    setSummary(summaryResponse.data?.summary || {});
    setTenants(Array.isArray(tenantsResponse.data?.tenants) ? tenantsResponse.data.tenants : []);
    setProperties(Array.isArray(propertiesResponse.data?.properties) ? propertiesResponse.data.properties : []);
  }, []);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const params = { page, limit: rowsPerPage };
      if (deferredSearch) params.search = deferredSearch;
      if (filters.property) params.property = filters.property;
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const response = await api.get('/self-owner/payments', { params });
      setPayments(Array.isArray(response.data?.payments) ? response.data.payments : []);
      setPagination(response.data?.pagination || { page: 1, limit: rowsPerPage, total: 0, pages: 1 });
    } catch (error) {
      setPayments([]);
      setPageError(messageFrom(error, 'Payments could not be loaded right now.'));
    } finally {
      setLoading(false);
    }
  }, [deferredSearch, filters.endDate, filters.paymentMethod, filters.property, filters.startDate, filters.status, page, rowsPerPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => { loadSupportingData().catch((error) => setPageError(messageFrom(error, 'Payment setup data could not be loaded.'))); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSupportingData]);
  useEffect(() => {
    const timer = window.setTimeout(() => { loadPayments(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPayments]);

  const refresh = async () => {
    await Promise.all([loadPayments(), loadSupportingData()]);
  };

  const updateFilters = (nextFilters) => { setFilters(nextFilters); setPage(1); };
  const closePaymentModal = () => { setPaymentModalOpen(false); setEditingPayment(null); };
  const openRecordPayment = () => { setEditingPayment(null); setWhatsappStatus(null); setPaymentModalOpen(true); };

  const loadReceipt = async (payment, print = false) => {
    try {
      const response = await api.get(`/self-owner/payments/${payment._id}`);
      setReceipt(response.data?.payment || payment);
      setAutoPrint(print);
      setReceiptOpen(true);
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error, 'This receipt could not be loaded.') });
    }
  };

  const openEdit = async (payment) => {
    setWhatsappStatus(null);
    try {
      const response = await api.get(`/self-owner/payments/${payment._id}`);
      setEditingPayment(response.data?.payment || payment);
      setPaymentModalOpen(true);
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error, 'This payment could not be loaded for editing.') });
    }
  };

  const savePayment = async (form) => {
    setSaving(true);
    setNotice(null);
    setWhatsappStatus(null);
    try {
      const payload = { ...form, amount: form.amountPaid };
      const action = editingPayment ? 'updated' : 'recorded';
      const response = editingPayment
        ? await api.put(`/self-owner/payments/${editingPayment._id}`, payload)
        : await api.post('/self-owner/payments', payload);
      const savedPayment = response.data?.payment;
      const whatsapp = response.data?.whatsapp;
      closePaymentModal();
      if (whatsapp?.sent) {
        setNotice({ type: 'success', text: `Payment ${action} successfully. WhatsApp receipt sent to tenant.` });
        setWhatsappStatus({ type: 'success', title: 'WhatsApp sent', recipient: whatsapp.recipient, text: whatsapp.messageId ? `Message ID: ${whatsapp.messageId}` : whatsapp.message });
      } else if (whatsapp && form.sendWhatsappReceipt && savedPayment?.status === 'paid') {
        setNotice({ type: 'warning', text: whatsapp.message || `Payment ${action} successfully, but WhatsApp receipt was not sent.` });
        setWhatsappStatus({ type: 'warning', title: 'WhatsApp not sent', recipient: whatsapp.recipient || form.whatsappRecipient, text: whatsapp.message });
      } else {
        setNotice({ type: 'success', text: `Payment ${action} successfully.` });
      }
      await refresh();
      if (savedPayment) {
        setReceipt(savedPayment);
        setAutoPrint(false);
        if (!form.sendWhatsappReceipt) setReceiptOpen(true);
      }
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error, 'The payment could not be saved.') });
    } finally {
      setSaving(false);
    }
  };

  const removePayment = async (payment) => {
    if (!window.confirm(`Delete payment ${payment.receiptNumber || ''}? This restores the tenant balance.`)) return;
    try {
      await api.delete(`/self-owner/payments/${payment._id}`);
      setNotice({ type: 'success', text: 'Payment deleted and tenant balance restored.' });
      if (payments.length === 1 && page > 1) setPage((current) => current - 1);
      await refresh();
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error, 'The payment could not be deleted.') });
    }
  };

  const total = Number(pagination.total) || 0;
  const from = total ? (Number(pagination.page || page) - 1) * rowsPerPage + 1 : 0;
  const to = Math.min(total, from + payments.length - 1);
  const pages = Math.max(1, Number(pagination.pages) || 1);
  const visiblePages = Array.from({ length: Math.min(pages, 5) }, (_, index) => Math.max(1, Math.min(pages - 4, page - 2) + index));

  return (
    <div className="payments-print-scope mx-auto max-w-[1600px] space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-black tracking-tight text-slate-950">Payments</h1><p className="mt-1 text-sm font-semibold text-slate-500">Track rent collections, balances, and payment history</p></div><button type="button" onClick={openRecordPayment} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 sm:hidden"><Plus className="h-4 w-4" />Record Payment</button></div>
      {notice && <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${noticeStyles[notice.type] || noticeStyles.error}`}><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} className="ml-auto text-current/70 hover:text-current">x</button></div>}
      {whatsappStatus && <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${noticeStyles[whatsappStatus.type] || noticeStyles.warning}`}><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><span>{whatsappStatus.title}</span><span className="break-all text-xs font-extrabold">To: {whatsappStatus.recipient || 'No number'}</span></div>{whatsappStatus.text && <p className="mt-1 text-xs font-semibold opacity-90">{whatsappStatus.text}</p>}</div>}
      <PaymentSummaryCards summary={summary} />
      <PaymentFilters filters={filters} properties={properties} onChange={updateFilters} onRecord={openRecordPayment} />
      {pageError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{pageError}</div>}
      <PaymentsTable payments={payments} loading={loading} onView={(payment) => loadReceipt(payment)} onEdit={openEdit} onPrint={(payment) => loadReceipt(payment, true)} onDownload={(payment) => loadReceipt(payment, true)} onDelete={removePayment} />
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-semibold text-slate-500">Showing <span className="font-extrabold text-slate-800">{from}-{to}</span> of <span className="font-extrabold text-slate-800">{total}</span> payments</p><div className="flex flex-wrap items-center gap-2"><label className="text-xs font-bold text-slate-500">Rows <select value={rowsPerPage} onChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(1); }} className="ml-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Previous page" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>{visiblePages.map((pageNumber) => <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`h-8 min-w-8 rounded-lg px-2 text-sm font-bold ${pageNumber === page ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{pageNumber}</button>)}<button type="button" disabled={page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))} aria-label="Next page" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></section>
      <RecordPaymentModal open={paymentModalOpen} tenants={tenants} editingPayment={editingPayment} saving={saving} onClose={closePaymentModal} onSave={savePayment} />
      {receiptOpen && <ReceiptModal payment={receipt} autoPrint={autoPrint} onClose={() => { setReceiptOpen(false); setAutoPrint(false); }} />}
    </div>
  );
};

export default SelfOwnerPayments;
