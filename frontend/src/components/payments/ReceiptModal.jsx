import { useEffect, useMemo } from 'react';
import {
  Building2, CalendarDays, Download, FileText,
  Mail, Phone, Printer, QrCode, ShieldCheck,
  Smartphone, UserRound, WalletCards, X
} from 'lucide-react';
import { formatUGX } from '../../utils/currency';
import PaymentStatusBadge from './PaymentStatusBadge';
import { dateTimeLabel, paymentMethodLabel, safeNumber } from './paymentUtils';
import { PLATFORM_NAME } from '../../constants/brand';

/* ─── small reusable pieces ─────────────────────────────────────────────── */

const ReceiptRow = ({ label, value, valueClass = 'text-slate-800' }) => (
  <div className="flex items-center justify-between gap-4 border-b border-dashed border-slate-100 px-4 py-2.5 text-sm last:border-0">
    <span className="font-semibold text-slate-500">{label}</span>
    <span className={`text-right font-extrabold ${valueClass}`}>{value}</span>
  </div>
);

const InfoBlock = ({ Icon, label, value, iconBg = 'bg-blue-50', iconColor = 'text-blue-600' }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-extrabold text-slate-900">{value}</p>
      </div>
    </div>
  );
};

/* ─── print helper ───────────────────────────────────────────────────────── */

const requestReceiptPrint = () => {
  document.body.classList.add('printing-receipt');
  document.querySelector('.payments-print-scope')?.classList.add('printing-receipt');
  window.setTimeout(() => window.print(), 50);
};

/* ─── main component ─────────────────────────────────────────────────────── */

const ReceiptModal = ({ payment, onClose, autoPrint = false }) => {
  const receipt    = payment || {};
  const tenant     = receipt.tenant     || {};
  const property   = receipt.property   || {};
  const unit       = receipt.unit       || {};
  const receivedBy = receipt.receivedBy || {};

  const paid      = safeNumber(receipt.amountPaid);
  const previous  = safeNumber(receipt.previousBalance || receipt.amount);
  const remaining = receipt.remainingBalance === undefined
    ? Math.max(0, previous - paid)
    : safeNumber(receipt.remainingBalance);

  const landlordName    = String(receivedBy.name        || 'Landlord').trim();
  const landlordCompany = String(receivedBy.companyName || landlordName).trim();
  const landlordPhone   = String(receivedBy.phone       || '').trim();
  const landlordEmail   = String(receivedBy.email       || '').trim();

  const verificationUrl = useMemo(() => {
    if (!receipt.receiptNumber) return '';
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${apiBase}/self-owner/payments/verify/${encodeURIComponent(receipt.receiptNumber)}`;
  }, [receipt.receiptNumber]);

  const qrUrl = verificationUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(verificationUrl)}`
    : '';

  const shareWhatsApp = () => {
    const msg = `Hello ${tenant.fullName || ''}, your payment receipt ${receipt.receiptNumber || ''} for ${formatUGX(paid)} is ready.${verificationUrl ? ` Verify: ${verificationUrl}` : ''}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const shareEmail = () => {
    const subject = `Payment Receipt ${receipt.receiptNumber || ''}`;
    const body = [
      `Hello ${tenant.fullName || ''},`,
      '',
      'Your payment receipt is ready.',
      '',
      `Receipt No : ${receipt.receiptNumber || 'N/A'}`,
      `Month      : ${receipt.paymentFor    || 'N/A'}`,
      `Amount Paid: ${formatUGX(paid)}`,
      '',
      verificationUrl ? `Verify receipt: ${verificationUrl}` : ''
    ].join('\n');
    window.open(`mailto:${encodeURIComponent(tenant.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
  };

  useEffect(() => {
    const finish = () => {
      document.body.classList.remove('printing-receipt');
      document.querySelector('.payments-print-scope')?.classList.remove('printing-receipt');
    };
    window.addEventListener('afterprint', finish);
    return () => window.removeEventListener('afterprint', finish);
  }, []);

  useEffect(() => {
    if (!autoPrint || !payment) return undefined;
    const t = window.setTimeout(requestReceiptPrint, 250);
    return () => window.clearTimeout(t);
  }, [autoPrint, payment]);

  if (!payment) return null;

  const print = () => requestReceiptPrint();

  return (
    <div
      className="receipt-print-root fixed inset-0 z-[90] overflow-y-auto bg-slate-950/45 p-0 backdrop-blur-[1px] sm:p-6 print:static print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-label="Payment receipt"
    >
      <div className="receipt-print-paper mx-auto my-0 w-full max-w-3xl overflow-hidden rounded-none bg-white shadow-2xl sm:my-4 sm:rounded-2xl print:my-0 print:max-w-none print:shadow-none">

        {/* ── TOP ACTION BAR (screen only) ── */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <p className="text-sm font-bold text-slate-700">Payment Receipt</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={print} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <Printer className="h-4 w-4" />Print
            </button>
            <button type="button" onClick={print} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <Download className="h-4 w-4" />Download PDF
            </button>
            <button type="button" onClick={onClose} aria-label="Close receipt" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <article>

          {/* ══ COLORED HEADER — gradient with landlord / company info ══ */}
          <header className="bg-gradient-to-br from-indigo-700 via-blue-700 to-blue-500 px-6 py-8 text-white sm:px-10 print:bg-blue-700">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">

              {/* Company / Landlord */}
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Issued By</p>
                  <p className="mt-0.5 text-xl font-black leading-tight text-white">{landlordCompany}</p>
                  {landlordCompany !== landlordName && (
                    <p className="mt-0.5 text-sm font-semibold text-blue-200">{landlordName}</p>
                  )}
                  <div className="mt-2 flex flex-col gap-1">
                    {landlordPhone && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-200">
                        <Phone className="h-3 w-3" />{landlordPhone}
                      </span>
                    )}
                    {landlordEmail && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-200">
                        <Mail className="h-3 w-3" />{landlordEmail}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Receipt reference */}
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Official Receipt</p>
                <p className="mt-1 text-2xl font-black text-white">{receipt.receiptNumber || 'Pending'}</p>
                <p className="mt-1 text-xs font-semibold text-blue-200">
                  {dateTimeLabel(receipt.paymentDate || receipt.paidDate)}
                </p>
                <div className="mt-2">
                  <PaymentStatusBadge status={receipt.status} />
                </div>
              </div>
            </div>
          </header>

          {/* ══ MONTH PAID FOR + AMOUNT BANNER ══ */}
          <div className="flex flex-col sm:flex-row">
            <div className="flex flex-1 items-center gap-4 bg-indigo-50 px-6 py-5 sm:px-10">
              <CalendarDays className="h-8 w-8 shrink-0 text-indigo-500" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-400">Month Paid For</p>
                <p className="mt-0.5 text-lg font-black text-indigo-800">{receipt.paymentFor || 'Rent Payment'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-emerald-500 px-6 py-5 sm:px-10">
              <WalletCards className="h-8 w-8 shrink-0 text-white" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">Amount Paid</p>
                <p className="mt-0.5 text-2xl font-black text-white">{formatUGX(paid)}</p>
              </div>
            </div>
          </div>

          {/* ══ MAIN BODY ══ */}
          <div className="px-6 py-8 sm:px-10">

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">

              {/* Tenant details */}
              <section>
                <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Tenant Details</h2>
                <div className="space-y-4">
                  <InfoBlock Icon={UserRound}  label="Received From" value={tenant.fullName || 'Unknown'}
                    iconBg="bg-blue-50"   iconColor="text-blue-600" />
                  <InfoBlock Icon={Phone}      label="Phone"
                    value={tenant.phone || tenant.email || undefined}
                    iconBg="bg-slate-100" iconColor="text-slate-600" />
                  <InfoBlock Icon={Building2}  label="Property" value={property.name || undefined}
                    iconBg="bg-purple-50" iconColor="text-purple-600" />
                  <InfoBlock Icon={FileText}   label="Unit"
                    value={unit.unitNumber ? `Unit ${unit.unitNumber}` : undefined}
                    iconBg="bg-amber-50"  iconColor="text-amber-600" />
                </div>
              </section>

              {/* Payment details */}
              <section>
                <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Payment Details</h2>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <ReceiptRow label="Payment Method"   value={paymentMethodLabel(receipt.paymentMethod)} />
                  <ReceiptRow label="Transaction Ref." value={receipt.paymentReference || receipt.transactionId || 'N/A'} />
                  <ReceiptRow label="Payment Date"     value={dateTimeLabel(receipt.paymentDate || receipt.paidDate)} />
                  <ReceiptRow label="Recorded By"      value={receivedBy.name || 'Landlord'} />
                </div>
              </section>
            </div>

            {/* Balance summary */}
            <section className="mt-8">
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Balance Summary</h2>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <span className="font-semibold text-slate-500">Previous Balance</span>
                  <span className="font-extrabold text-slate-800">{formatUGX(previous)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-emerald-50 px-5 py-3 text-sm">
                  <span className="font-semibold text-emerald-700">Amount Paid</span>
                  <span className="font-extrabold text-emerald-700">− {formatUGX(paid)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-3 text-sm">
                  <span className="font-semibold text-slate-500">Remaining Balance</span>
                  <span className={`font-black ${remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {remaining > 0 ? formatUGX(remaining) : 'CLEARED ✓'}
                  </span>
                </div>
              </div>
            </section>

            {/* QR verification */}
            <section className="mt-8 flex flex-col gap-5 overflow-hidden rounded-xl border border-slate-200 p-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5">
                {qrUrl
                  ? <img src={qrUrl} alt="QR code to verify this receipt" className="h-full w-full" />
                  : <QrCode className="h-14 w-14 text-slate-300" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  <h3 className="font-black text-slate-900">Verify this Receipt</h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  Scan the QR code or visit the link below to confirm the authenticity of this receipt.
                </p>
                {verificationUrl && (
                  <p className="mt-1.5 break-all text-xs font-bold text-blue-600">{verificationUrl}</p>
                )}
              </div>
            </section>
          </div>

          {/* ══ FOOTER — gradient ══ */}
          <footer className="bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 px-6 py-6 text-center sm:px-10">
            <p className="text-base font-black text-indigo-800">Thank you for your payment!</p>
            <p className="mt-1 text-sm font-medium text-slate-500">
              We appreciate your prompt and timely payment.
            </p>
            <p className="mt-5 border-t border-indigo-100 pt-4 text-xs font-semibold text-slate-400">
              This is a system-generated receipt · {PLATFORM_NAME}
            </p>
          </footer>
        </article>

        {/* ── SHARE BUTTONS (screen only) ── */}
        <div className="receipt-print-actions print:hidden border-t border-slate-200 bg-white px-4 py-4">
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={shareWhatsApp}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700">
              <Smartphone className="h-4 w-4" />WhatsApp
            </button>
            <button type="button" onClick={shareEmail}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <Mail className="h-4 w-4" />Email
            </button>
            <button type="button" onClick={print}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
              <Printer className="h-4 w-4" />Print Receipt
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;

