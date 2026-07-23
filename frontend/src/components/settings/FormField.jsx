export default function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  readOnly = false,
  textarea = false,
  min,
  max,
  options = null
}) {
  const baseClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100 disabled:text-slate-500';

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {options ? (
        <select className={baseClass} value={value ?? ''} onChange={(event) => onChange(event.target.value)} disabled={readOnly}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : textarea ? (
        <textarea
          className={`${baseClass} min-h-[96px]`}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      ) : (
        <input
          className={baseClass}
          type={type}
          min={min}
          max={max}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      )}
    </label>
  );
}
