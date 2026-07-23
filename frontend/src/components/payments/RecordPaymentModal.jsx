import { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarDays, Check, ChevronDown, Landmark, Save, Smartphone, X } from 'lucide-react';
import { formatUGX } from '../../utils/currency';
import PaymentStatusBadge from './PaymentStatusBadge';
import ProofOfPaymentUploader from './ProofOfPaymentUploader';
import { dateInputValue, paymentStatusPreview, safeNumber } from './paymentUtils';

const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const autoPaymentFor = (date) => { const d = date ? new Date(date) : new Date(); return `Rent for ${FULL_MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

const blankForm = () => ({ tenantId: '', propertyId: '', unitId: '', paymentFor: autoPaymentFor(), monthlyRent: 0, currentBalance: 0, amountPaid: '', paymentDate: dateInputValue(), paymentMethod: 'mtn_mobile_money', paymentReference: '', proofOfPayment: null, notes: '', sendWhatsappReceipt: true });

const methodCards = [
  { value: 'mtn_mobile_money', label: 'MTN Mobile Money', description: 'Mobile Money', Icon: Smartphone, iconClass: 'bg-amber-100 text-amber-700' },
  { value: 'airtel_money', label: 'Airtel Money', description: 'Mobile Money', Icon: Smartphone, iconClass: 'bg-rose-100 text-rose-700' },
  { value: 'bank_transfer', label: 'Bank Transfer', description: 'Bank Transfer', Icon: Landmark, iconClass: 'bg-blue-100 text-blue-700' },
  { value: 'cash', label: 'Cash', description: 'Cash Payment', Icon: Banknote, iconClass: 'bg-emerald-100 text-emerald-700' },
];

const SectionHeading = ({ number, title }) => <div className="mb-3 flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">{number}</span><h3 className="text-sm font-extrabold text-slate-800">{title}</h3></div>;

const SelectField = ({ label, value, onChange, children, disabled = false, required = false }) => <label className="block min-w-0 text-xs font-bold text-slate-600">{label}{required && <span className="text-rose-500"> *</span>}<span className="relative mt-1.5 block"><select value={value} onChange={onChange} disabled={disabled} required={required} className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500">{children}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></span></label>;

const InputField = ({ label, required = false, children }) => <label className="block min-w-0 text-xs font-bold text-slate-600">{label}{required && <span className="text-rose-500"> *</span>}{children}</label>;

const tenantWhatsappNumber = (tenant) => String(tenant?.whatsappNumber || tenant?.whatsAppNumber || tenant?.phone || '').trim();

const RecordPaymentModal = ({ open, tenants = [], editingPayment, saving, onClose, onSave }) => {
  const [form, setForm] = useState(blankForm);
  const [submitError, setSubmitError] = useState('');
  const selectedTenant = useMemo(() => tenants.find((tenant) => String(tenant._id) === String(form.tenantId)), [form.tenantId, tenants]);
  const messageTenant = selectedTenant || editingPayment?.tenant || {};
  const whatsappRecipient = tenantWhatsappNumber(messageTenant);
  const amountPaid = safeNumber(form.amountPaid);
  const balance = safeNumber(form.currentBalance);
  const remainingBalance = Math.max(0, balance - amountPaid);
  const previewStatus = paymentStatusPreview(amountPaid, balance);
  const whatsappReady = previewStatus === 'paid' && Boolean(whatsappRecipient);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setSubmitError('');
      if (editingPayment) {
        setForm({
          tenantId: editingPayment.tenant?._id || editingPayment.tenant || '', propertyId: editingPayment.property?._id || editingPayment.property || '', unitId: editingPayment.unit?._id || editingPayment.unit || '',
          paymentFor: editingPayment.paymentFor || '', monthlyRent: safeNumber(editingPayment.monthlyRent), currentBalance: safeNumber(editingPayment.previousBalance || editingPayment.amount),
          amountPaid: String(safeNumber(editingPayment.amountPaid)), paymentDate: dateInputValue(editingPayment.paymentDate || editingPayment.paidDate), paymentMethod: editingPayment.paymentMethod || 'mtn_mobile_money',
          paymentReference: editingPayment.paymentReference || editingPayment.transactionId || '', proofOfPayment: editingPayment.proofOfPayment?.base64 ? editingPayment.proofOfPayment : null, notes: editingPayment.notes || '',
          sendWhatsappReceipt: editingPayment.status !== 'paid'
        });
        return;
      }
      setForm(blankForm());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editingPayment, open]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  // Auto-sync paymentFor when payment date changes, but only while it still
  // matches the auto-generated "Rent for Month Year" pattern.
  const handleDateChange = (value) => {
    const updates = { paymentDate: value };
    if (/^Rent for [A-Za-z]+ \d{4}$/.test(form.paymentFor)) updates.paymentFor = autoPaymentFor(value);
    setForm((current) => ({ ...current, ...updates }));
  };
  const selectTenant = (tenantId) => {
    const tenant = tenants.find((item) => String(item._id) === String(tenantId));
    const unit = tenant?.unit || {};
    const rent = safeNumber(tenant?.rentAmount) || safeNumber(unit?.rentAmount);
    const currentBalance = safeNumber(tenant?.outstandingBalance) || rent;
    setForm((current) => ({ ...current, tenantId, propertyId: tenant?.property?._id || tenant?.property || '', unitId: unit?._id || tenant?.unit || '', monthlyRent: rent, currentBalance }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.tenantId) { setSubmitError('Choose a tenant before saving this payment.'); return; }
    if (amountPaid <= 0) { setSubmitError('Enter an amount greater than zero.'); return; }
    setSubmitError('');
    await onSave({ ...form, amountPaid, monthlyRent: safeNumber(form.monthlyRent), previousBalance: balance, sendWhatsappReceipt: Boolean(form.sendWhatsappReceipt && whatsappReady), whatsappRecipient });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[1px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Record payment">
      <div className="flex max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[94vh] sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-7 sm:py-5"><div><h2 className="text-xl font-black tracking-tight text-slate-950">{editingPayment ? 'Edit Payment' : 'Record Payment'}</h2><p className="mt-1 text-sm font-medium text-slate-500">Enter payment details and receipt information.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close record payment dialog"><X className="h-5 w-5" /></button></div>
        <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <section><SectionHeading number="1" title="Tenant & Unit" /><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><SelectField label="Tenant" required value={form.tenantId} onChange={(event) => selectTenant(event.target.value)}><option value="">Select tenant</option>{tenants.map((tenant) => <option key={tenant._id} value={tenant._id}>{tenant.fullName || 'Unnamed tenant'}</option>)}</SelectField><SelectField label="Property" required disabled value={form.propertyId} onChange={() => {}}><option value="">Select property</option>{selectedTenant?.property && <option value={selectedTenant.property._id || selectedTenant.property}>{selectedTenant.property.name || 'Assigned property'}</option>}{!selectedTenant && editingPayment?.property && <option value={editingPayment.property._id || editingPayment.property}>{editingPayment.property.name || 'Assigned property'}</option>}</SelectField><SelectField label="Unit" required disabled value={form.unitId} onChange={() => {}}><option value="">Select unit</option>{selectedTenant?.unit && <option value={selectedTenant.unit._id || selectedTenant.unit}>{selectedTenant.unit.unitNumber ? `Unit ${selectedTenant.unit.unitNumber}` : 'Assigned unit'}</option>}{!selectedTenant && editingPayment?.unit && <option value={editingPayment.unit._id || editingPayment.unit}>{editingPayment.unit.unitNumber ? `Unit ${editingPayment.unit.unitNumber}` : 'Assigned unit'}</option>}</SelectField><InputField label="Payment For" required><span className="relative mt-1.5 block"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required value={form.paymentFor} onChange={(event) => update('paymentFor', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Jan 2025" /></span></InputField></div></section>
          <section className="mt-6"><SectionHeading number="2" title="Payment Details" /><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><InputField label="Monthly Rent"><input readOnly value={formatUGX(form.monthlyRent)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-500" /></InputField><InputField label="Current Balance"><input readOnly value={formatUGX(balance)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-500" /></InputField><InputField label="Amount Paid" required><span className="relative mt-1.5 block"><input required min="1" type="number" inputMode="numeric" value={form.amountPaid} onChange={(event) => update('amountPaid', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 pr-12 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="0" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">UGX</span></span></InputField><InputField label="Payment Date" required><span className="relative mt-1.5 block"><input required type="date" value={form.paymentDate} onChange={(event) => handleDateChange(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></span></InputField></div><div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><InputField label="Payment Method" required><input readOnly value={methodCards.find((method) => method.value === form.paymentMethod)?.label || 'Select below'} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600" /></InputField><InputField label="Payment Reference"><input value={form.paymentReference} onChange={(event) => update('paymentReference', event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="MM1234567890" /></InputField></div></section>
          <section className="mt-6"><SectionHeading number="3" title="Payment Method Choices" /><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{methodCards.map((method) => { const selected = form.paymentMethod === method.value; return <button type="button" key={method.value} onClick={() => update('paymentMethod', method.value)} className={`relative flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${method.iconClass}`}><method.Icon className="h-4 w-4" /></span><span><span className="block text-sm font-extrabold text-slate-800">{method.label}</span><span className="mt-0.5 block text-xs font-medium text-slate-500">{method.description}</span></span>{selected && <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white"><Check className="h-3 w-3" /></span>}</button>; })}</div></section>
          <section className="mt-6"><SectionHeading number="4" title="Proof of Payment" /><ProofOfPaymentUploader value={form.proofOfPayment} onChange={(proofOfPayment) => update('proofOfPayment', proofOfPayment)} disabled={saving} /></section>
          <section className="mt-6"><SectionHeading number="5" title="Notes" /><InputField label="Notes / Additional Details"><textarea value={form.notes} maxLength={500} onChange={(event) => update('notes', event.target.value)} className="mt-1.5 min-h-20 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Enter any notes or additional details about this payment…" /></InputField><p className="mt-1 text-right text-xs font-semibold text-slate-400">{form.notes.length}/500</p><label className={`mt-3 flex items-start gap-3 rounded-lg border px-3 py-2.5 ${whatsappReady ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}><input type="checkbox" checked={Boolean(form.sendWhatsappReceipt && whatsappReady)} onChange={(event) => update('sendWhatsappReceipt', event.target.checked)} disabled={!whatsappReady} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50" /><span className="min-w-0"><span className="flex items-center gap-2 text-sm font-extrabold text-slate-800"><Smartphone className="h-4 w-4 text-emerald-600" />Send WhatsApp receipt when cleared</span><span className="mt-1 block break-all rounded-md bg-white/70 px-2 py-1 text-xs font-extrabold text-slate-700">To: {whatsappRecipient || 'No tenant phone number available'}</span><span className="mt-1 block text-xs font-semibold text-slate-500">{previewStatus !== 'paid' ? 'Available once the amount clears the balance.' : whatsappRecipient ? 'Tenant receives the receipt after this payment is saved.' : 'Add the tenant phone number before sending on WhatsApp.'}</span></span></label></section>
          <section className="mt-5 grid grid-cols-2 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-slate-50 py-3 sm:grid-cols-4"><div className="px-3 text-center"><p className="text-[11px] font-bold text-slate-500">Expected Rent</p><p className="mt-1 text-sm font-black text-blue-600">{formatUGX(balance)}</p></div><div className="px-3 text-center"><p className="text-[11px] font-bold text-slate-500">Amount Paid</p><p className="mt-1 text-sm font-black text-emerald-600">{formatUGX(amountPaid)}</p></div><div className="mt-3 border-t border-slate-200 px-3 pt-3 text-center sm:mt-0 sm:border-t-0 sm:pt-0"><p className="text-[11px] font-bold text-slate-500">Remaining Balance</p><p className="mt-1 text-sm font-black text-amber-600">{formatUGX(remainingBalance)}</p></div><div className="mt-3 border-l border-t border-slate-200 px-3 pt-3 text-center sm:mt-0 sm:border-t-0 sm:pt-0"><p className="text-[11px] font-bold text-slate-500">Status Preview</p><PaymentStatusBadge status={previewStatus} className="mt-1" /></div></section>
          {submitError && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{submitError}</p>}
        </form>
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-4 sm:px-7"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : editingPayment ? 'Save Changes' : 'Save Payment'}</button></div>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
