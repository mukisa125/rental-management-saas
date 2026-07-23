import { useState } from 'react';
import { X, Printer, Download, Send, Check } from 'lucide-react';
import { formatUGX } from '../../utils/currency';

const safe = (value) => Number(value) || 0;
const paidMonthLabel = (invoice) => {
  const month = Number(invoice?.paymentPeriod?.month);
  const year = Number(invoice?.paymentPeriod?.year);
  if (Number.isFinite(month) && month >= 1 && month <= 12 && Number.isFinite(year) && year > 1900) {
    return new Date(year, month - 1, 1).toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
  }
  if (invoice?.paymentFor) return String(invoice.paymentFor);
  return new Date(invoice?.dueDate || invoice?.createdAt || Date.now()).toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
};

export default function InvoicePreview({
  invoice,
  isOpen,
  onClose,
  onRecordPayment,
  onPrint,
  loading
}) {
  const [recordPaymentMode, setRecordPaymentMode] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');

  if (!isOpen) return null;

  const tenantInfo = invoice.tenant || {};
  const propertyInfo = invoice.property || {};
  const unitInfo = invoice.unit || {};
  const ownerInfo = invoice.owner || {};

  const totalDue =
    safe(invoice.amount) +
    safe(invoice.previousBalance) +
    safe(invoice.penalties) -
    safe(invoice.discount);

  const balance = Math.max(0, totalDue - safe(invoice.amountPaid));

  const handleRecordPayment = () => {
    const amount = safe(paymentAmount);
    if (amount <= 0) {
      setPaymentError('Payment amount must be greater than 0');
      return;
    }
    if (amount > balance) {
      setPaymentError(`Payment cannot exceed balance of ${formatUGX(balance)}`);
      return;
    }
    onRecordPayment(invoice._id, amount);
    setRecordPaymentMode(false);
    setPaymentAmount('');
  };

  const handleDownloadPdf = () => {
    if (onPrint) {
      onPrint();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Invoice {invoice.receiptNumber || 'Draft'}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Invoice Document */}
          <div className="border border-slate-200 rounded-2xl bg-white p-8 space-y-6">
            {/* Header Section */}
            <div className="text-center border-b border-slate-200 pb-6">
              <h1 className="text-3xl font-black text-blue-600 mb-2">RENT INVOICE</h1>
              <p className="text-sm text-slate-600">RentProLink Property Management System</p>
            </div>

            {/* Invoice Info and Dates */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Invoice Details</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Invoice No:</span>
                    <span className="font-bold text-slate-900">{invoice.receiptNumber || 'Draft'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Issue Date:</span>
                    <span className="font-bold text-slate-900">
                      {new Date(invoice.createdAt).toLocaleDateString('en-UG')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Due Date:</span>
                    <span className="font-bold text-slate-900">
                      {new Date(invoice.dueDate).toLocaleDateString('en-UG')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Status:</span>
                    <span className={`font-bold ${
                      invoice.status === 'paid' ? 'text-emerald-600' :
                      invoice.status === 'overdue' ? 'text-rose-600' :
                      'text-amber-600'
                    }`}>
                      {invoice.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Month Paid:</span>
                    <span className="font-bold text-slate-900">{paidMonthLabel(invoice)}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Tenant Information</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div>
                    <span className="text-slate-600 text-xs">Name</span>
                    <p className="font-bold text-slate-900">{tenantInfo.fullName || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 text-xs">Phone</span>
                    <p className="font-bold text-slate-900">{tenantInfo.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 text-xs">Email</span>
                    <p className="font-bold text-slate-900">{tenantInfo.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Property and Prepared By */}
            <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-6">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Property & Unit</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div>
                    <span className="text-slate-600 text-xs">Property</span>
                    <p className="font-bold text-slate-900">{propertyInfo.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 text-xs">Unit</span>
                    <p className="font-bold text-slate-900">{unitInfo.unitNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Prepared By</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div>
                    <span className="text-slate-600 text-xs">Owner</span>
                    <p className="font-bold text-slate-900">{ownerInfo.name || 'Self Owner'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="border-t border-slate-200 pt-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold text-slate-700">Description</th>
                    <th className="text-right px-4 py-3 font-bold text-slate-700">Amount (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700">Rent Amount ({paidMonthLabel(invoice)})</td>
                    <td className="text-right px-4 py-3 font-bold text-slate-900">
                      {formatUGX(safe(invoice.amount))}
                    </td>
                  </tr>
                  {safe(invoice.previousBalance) > 0 && (
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700">Previous Balance</td>
                      <td className="text-right px-4 py-3 font-bold text-slate-900">
                        {formatUGX(safe(invoice.previousBalance))}
                      </td>
                    </tr>
                  )}
                  {safe(invoice.penalties) > 0 && (
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700">Late Fee</td>
                      <td className="text-right px-4 py-3 font-bold text-rose-600">
                        {formatUGX(safe(invoice.penalties))}
                      </td>
                    </tr>
                  )}
                  {safe(invoice.discount) > 0 && (
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700">Discount</td>
                      <td className="text-right px-4 py-3 font-bold text-emerald-600">
                        -{formatUGX(safe(invoice.discount))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Summary */}
            <div className="border-t border-slate-200 pt-6 flex justify-end">
              <div className="w-80">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total Due:</span>
                    <span className="font-bold text-slate-900">{formatUGX(totalDue)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-200 pt-3">
                    <span className="text-slate-600">Amount Paid:</span>
                    <span className="font-bold text-emerald-600">{formatUGX(safe(invoice.amountPaid))}</span>
                  </div>
                  <div className="flex justify-between text-base bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mt-3">
                    <span className="font-bold text-blue-900">Balance Due:</span>
                    <span className="font-black text-blue-900">{formatUGX(balance)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="border-t border-slate-200 pt-6">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Notes</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-4">{invoice.notes}</p>
              </div>
            )}

            {/* Payment Instructions */}
            <div className="border-t border-slate-200 pt-6 bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-bold text-blue-900 uppercase mb-2">Payment Instructions</p>
              <p className="text-sm text-blue-800">
                Please settle the outstanding balance by the due date. Payment can be made via mobile money, bank transfer, or cash.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-slate-200 pt-6">
            {!recordPaymentMode ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <button
                  onClick={onPrint}
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    // Implement send email
                  }}
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Send Invoice
                </button>
                {balance > 0 && (
                  <button
                    onClick={() => setRecordPaymentMode(true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    Record Payment
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
                <h3 className="font-bold text-blue-900">Record Payment</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Amount to Record (Max: {formatUGX(balance)})
                    </label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => {
                        setPaymentAmount(e.target.value);
                        setPaymentError('');
                      }}
                      placeholder="Enter payment amount"
                      className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    {paymentError && (
                      <p className="mt-1 text-xs text-rose-600">{paymentError}</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setRecordPaymentMode(false);
                        setPaymentAmount('');
                        setPaymentError('');
                      }}
                      className="flex-1 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRecordPayment}
                      disabled={loading}
                      className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Recording...' : 'Confirm Payment'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
