import { AlertCircle, ChevronRight, FileText } from 'lucide-react';
import { formatUGX } from '../../utils/currency';

export const safeText = (value, fallback = 'N/A') => {
  const text = String(value ?? '').trim();
  if (!text || ['undefined', 'null', 'nan', 'invalid date'].includes(text.toLowerCase())) return fallback;
  return text;
};

export const safeNumber = (value) => Number(value) || 0;

export const dateLabel = (value, fallback = 'N/A') => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const dateTimeLabel = (value, fallback = 'N/A') => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return fallback;
  return `${dateLabel(date)} ${date.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}`;
};

export const daysUntil = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 0;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
};

export const methodLabel = (method) => safeText(method, 'N/A')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const fileSizeLabel = (size) => {
  const bytes = safeNumber(size);
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const resolveAvatar = (value) => {
  if (!value) return '';
  const text = String(value);
  if (text.startsWith('data:') || text.startsWith('http://') || text.startsWith('https://')) return text;
  return `data:image/webp;base64,${text}`;
};

export const resolveImage = (image) => {
  if (!image) return '';
  if (typeof image === 'string') return resolveAvatar(image);
  if (image.base64) {
    return String(image.base64).startsWith('data:')
      ? image.base64
      : `data:${image.contentType || 'image/webp'};base64,${image.base64}`;
  }
  if (image.url) return image.url;
  return '';
};

const toneMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-rose-50 text-rose-600',
  violet: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-600'
};

export function PageHeader({ title, subtitle, action }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-normal text-slate-950">{title}</h1>
        {subtitle && <p className="mt-2 text-sm font-medium text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function TenantStatCard({ icon: Icon, label, value, note, tone = 'blue' }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-600">{label}</p>
          <p className={`mt-3 break-words text-2xl font-black leading-tight ${tone === 'green' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-rose-600' : 'text-slate-950'}`}>
            {value}
          </p>
          {note && <p className={`mt-3 text-sm font-semibold ${tone === 'green' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-rose-600' : 'text-blue-600'}`}>{note}</p>}
        </div>
        {Icon && (
          <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl ${toneMap[tone] || toneMap.blue}`}>
            <Icon className="h-7 w-7" />
          </span>
        )}
      </div>
    </article>
  );
}

export function TenantPanel({ title, action, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function QuickActionCard({ icon: Icon, title, subtitle, onClick, to }) {
  const content = (
    <>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-slate-900">{title}</span>
        <span className="mt-1 block text-xs font-medium text-slate-500">{subtitle}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
    </>
  );

  const className = 'flex min-h-20 w-full items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-md';

  if (to) return <a href={to} className={className}>{content}</a>;
  return <button type="button" onClick={onClick} className={className}>{content}</button>;
}

export function FieldRow({ label, value, valueClassName = '' }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <dt className="text-sm font-semibold text-slate-500">{label}</dt>
      <dd className={`text-right text-sm font-black text-slate-900 ${valueClassName}`}>{value}</dd>
    </div>
  );
}

export function TenantStatusBadge({ status }) {
  const value = safeText(status, 'pending').toLowerCase();
  const style = value === 'paid' || value === 'active' || value === 'completed' || value === 'up_to_date'
    ? 'bg-emerald-50 text-emerald-700'
    : value === 'pending' || value === 'in_progress' || value === 'assigned'
      ? 'bg-amber-50 text-amber-700'
      : value === 'overdue' || value === 'rejected' || value === 'cancelled'
        ? 'bg-rose-50 text-rose-700'
        : 'bg-slate-100 text-slate-700';

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ${style}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}

export function EmptyTenantState({ title = 'No records found', description = 'Nothing to show yet.' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <FileText className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-4 text-sm font-black text-slate-900">{title}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
    </div>
  );
}

export function TenantErrorState({ message }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <span>{message || 'Something went wrong. Please try again.'}</span>
      </div>
    </div>
  );
}

export function TenantLoadingState({ message = 'Loading tenant portal...' }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="mt-3 text-sm font-semibold text-slate-500">{message}</p>
      </div>
    </div>
  );
}

export { formatUGX };
