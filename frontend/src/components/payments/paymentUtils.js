export const PAYMENT_METHODS = [
  { value: 'mtn_mobile_money', label: 'MTN Mobile Money', description: 'Mobile Money', tone: 'bg-amber-100 text-amber-700' },
  { value: 'airtel_money', label: 'Airtel Money', description: 'Mobile Money', tone: 'bg-rose-100 text-rose-700' },
  { value: 'bank_transfer', label: 'Bank Transfer', description: 'Bank Transfer', tone: 'bg-blue-100 text-blue-700' },
  { value: 'cash', label: 'Cash', description: 'Cash Payment', tone: 'bg-emerald-100 text-emerald-700' },
];

export const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const paymentMethodLabel = (value) => PAYMENT_METHODS.find((method) => method.value === value)?.label
  || String(value || 'Not specified').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const statusLabel = (value) => String(value || 'pending').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const dateInputValue = (value = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

export const dateLabel = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString('en-UG', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

export const dateTimeLabel = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString('en-UG', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });
};

export const fileSizeLabel = (bytes) => {
  const value = safeNumber(bytes);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export const paymentStatusPreview = (amountPaid, balance) => {
  const amount = safeNumber(amountPaid);
  const expected = safeNumber(balance);
  if (amount <= 0) return 'pending';
  return amount >= expected ? 'paid' : 'partial';
};
