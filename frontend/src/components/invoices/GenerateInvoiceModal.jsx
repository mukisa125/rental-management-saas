import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { formatUGX } from '../../utils/currency';

const safe = (value) => Number(value) || 0;

export default function GenerateInvoiceModal({
  isOpen,
  onClose,
  onSubmit,
  tenants,
  properties,
  loading
}) {
  const [formData, setFormData] = useState({
    tenantId: '',
    propertyId: '',
    unitId: '',
    billingMonth: new Date().toISOString().slice(0, 7),
    rentAmount: '',
    dueDate: '',
    previousBalance: '',
    lateFee: '',
    discount: '',
    notes: ''
  });

  const [selectedTenant, setSelectedTenant] = useState(null);
  const [propertyUnits, setPropertyUnits] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (formData.tenantId) {
      const tenant = tenants.find((t) => t._id === formData.tenantId);
      setSelectedTenant(tenant);
      if (tenant) {
        setFormData((prev) => ({
          ...prev,
          propertyId: tenant.property?._id || '',
          unitId: tenant.unit?._id || '',
          rentAmount: prev.rentAmount || tenant.rentAmount || '',
          previousBalance: prev.previousBalance || tenant.outstandingBalance || 0
        }));
      }
    }
  }, [formData.tenantId, tenants]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.tenantId) newErrors.tenantId = 'Tenant is required';
    if (!formData.propertyId) newErrors.propertyId = 'Property is required';
    if (!formData.billingMonth) newErrors.billingMonth = 'Billing month is required';
    if (!formData.rentAmount || safe(formData.rentAmount) <= 0) newErrors.rentAmount = 'Rent amount must be greater than 0';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const totalAmount =
      safe(formData.rentAmount) +
      safe(formData.previousBalance) +
      safe(formData.lateFee) -
      safe(formData.discount);

    onSubmit({
      tenantId: formData.tenantId,
      propertyId: formData.propertyId,
      unitId: formData.unitId,
      billingMonth: formData.billingMonth,
      amount: totalAmount,
      rentAmount: safe(formData.rentAmount),
      dueDate: formData.dueDate,
      previousBalance: safe(formData.previousBalance),
      penalties: safe(formData.lateFee),
      discount: safe(formData.discount),
      notes: formData.notes,
      paymentMethod: 'mobile_money',
      status: 'pending'
    });
  };

  const totalDue =
    safe(formData.rentAmount) +
    safe(formData.previousBalance) +
    safe(formData.lateFee) -
    safe(formData.discount);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Generate Invoice</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Tenant Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Select Tenant *
            </label>
            <select
              name="tenantId"
              value={formData.tenantId}
              onChange={handleChange}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors ${
                errors.tenantId
                  ? 'border-rose-300 bg-rose-50 text-rose-900'
                  : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
            >
              <option value="">Choose a tenant...</option>
              {tenants.map((tenant) => (
                <option key={tenant._id} value={tenant._id}>
                  {tenant.fullName} - {tenant.property?.name}
                </option>
              ))}
            </select>
            {errors.tenantId && <p className="mt-1 text-xs text-rose-600">{errors.tenantId}</p>}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Property */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Property</label>
              <input
                type="text"
                value={selectedTenant?.property?.name || 'N/A'}
                disabled
                className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm text-slate-600"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Unit</label>
              <input
                type="text"
                value={selectedTenant?.unit?.unitNumber || 'N/A'}
                disabled
                className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm text-slate-600"
              />
            </div>

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
              <label className="block text-sm font-bold text-slate-700 mb-2">Due Date *</label>
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

            {/* Rent Amount */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Rent Amount *</label>
              <input
                type="number"
                name="rentAmount"
                value={formData.rentAmount}
                onChange={handleChange}
                placeholder="0"
                className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors ${
                  errors.rentAmount
                    ? 'border-rose-300 bg-rose-50 text-rose-900'
                    : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}
              />
              {errors.rentAmount && <p className="mt-1 text-xs text-rose-600">{errors.rentAmount}</p>}
            </div>

            {/* Previous Balance */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Previous Balance</label>
              <input
                type="number"
                name="previousBalance"
                value={formData.previousBalance}
                onChange={handleChange}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Late Fee */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Late Fee</label>
              <input
                type="number"
                name="lateFee"
                value={formData.lateFee}
                onChange={handleChange}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Discount */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Discount</label>
              <input
                type="number"
                name="discount"
                value={formData.discount}
                onChange={handleChange}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Total Due Summary */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-600 font-semibold">Rent Amount</p>
                <p className="text-lg font-black text-blue-900">{formatUGX(safe(formData.rentAmount))}</p>
              </div>
              <div>
                <p className="text-blue-600 font-semibold">Total Due</p>
                <p className="text-lg font-black text-blue-900">{formatUGX(totalDue)}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any special notes or payment instructions..."
              rows="3"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
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
              <Plus className="h-4 w-4" />
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
