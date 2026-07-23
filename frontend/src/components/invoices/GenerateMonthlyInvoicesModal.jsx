import { useEffect, useState } from 'react';
import { X, FileText } from 'lucide-react';
import { formatUGX } from '../../utils/currency';

const safe = (value) => Number(value) || 0;

export default function GenerateMonthlyInvoicesModal({
  isOpen,
  onClose,
  onSubmit,
  properties,
  loading
}) {
  const [formData, setFormData] = useState({
    billingMonth: new Date().toISOString().slice(0, 7),
    dueDate: '',
    propertyFilter: '',
    includePreviousBalance: true,
    addLateFee: false,
    lateFeeAmount: '',
    notes: ''
  });

  const [preview, setPreview] = useState({
    totalTenants: 0,
    alreadyInvoiced: 0,
    newInvoices: 0,
    totalExpectedRent: 0
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.billingMonth) newErrors.billingMonth = 'Billing month is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    if (formData.addLateFee && !formData.lateFeeAmount) {
      newErrors.lateFeeAmount = 'Late fee amount is required';
    }
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      billingMonth: formData.billingMonth,
      dueDate: formData.dueDate,
      propertyFilter: formData.propertyFilter,
      includePreviousBalance: formData.includePreviousBalance,
      addLateFee: formData.addLateFee,
      lateFeeAmount: formData.addLateFee ? safe(formData.lateFeeAmount) : 0,
      notes: formData.notes
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Generate Monthly Invoices</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Info Box */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm font-semibold text-blue-900">
              🔄 Generate invoices for all active tenants in the selected property for the billing month.
            </p>
          </div>

          {/* Billing Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700">Billing Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Billing Month */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Billing Month *
                </label>
                <input
                  type="month"
                  name="billingMonth"
                  value={formData.billingMonth}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors ${
                    errors.billingMonth
                      ? 'border-rose-300 bg-rose-50 text-rose-900'
                      : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
                {errors.billingMonth && (
                  <p className="mt-1 text-xs text-rose-600">{errors.billingMonth}</p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors ${
                    errors.dueDate
                      ? 'border-rose-300 bg-rose-50 text-rose-900'
                      : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
                {errors.dueDate && <p className="mt-1 text-xs text-rose-600">{errors.dueDate}</p>}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700">Filters (Optional)</h3>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Filter by Property (Optional)
              </label>
              <select
                name="propertyFilter"
                value={formData.propertyFilter}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Properties</option>
                {properties.map((property) => (
                  <option key={property._id} value={property._id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="includePreviousBalance"
                  checked={formData.includePreviousBalance}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Include tenants with previous balances
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="addLateFee"
                  checked={formData.addLateFee}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Add late fee to invoices
                </span>
              </label>

              {formData.addLateFee && (
                <div className="ml-7">
                  <input
                    type="number"
                    name="lateFeeAmount"
                    value={formData.lateFeeAmount}
                    onChange={handleChange}
                    placeholder="Enter late fee amount"
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors ${
                      errors.lateFeeAmount
                        ? 'border-rose-300 bg-rose-50 text-rose-900'
                        : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                  {errors.lateFeeAmount && (
                    <p className="mt-1 text-xs text-rose-600">{errors.lateFeeAmount}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any notes for all invoices (e.g., maintenance fund, utilities included)..."
              rows="3"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Preview Summary */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-600 mb-3">GENERATION PREVIEW</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-slate-600">Active Tenants</p>
                <p className="text-lg font-black text-slate-900">-</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Already Invoiced</p>
                <p className="text-lg font-black text-slate-900">-</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">New Invoices</p>
                <p className="text-lg font-black text-slate-900">-</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Total Expected Rent</p>
                <p className="text-lg font-black text-slate-900">-</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {loading ? 'Generating...' : 'Generate Invoices'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
