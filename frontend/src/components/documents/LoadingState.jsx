export default function LoadingState({ label = 'Loading documents...' }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p>
      </div>
      <div className="p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid grid-cols-12 gap-3 border-b border-slate-100 py-3 last:border-b-0">
            <div className="col-span-4 h-4 animate-pulse rounded bg-slate-200" />
            <div className="col-span-2 h-4 animate-pulse rounded bg-slate-200" />
            <div className="col-span-2 h-4 animate-pulse rounded bg-slate-200" />
            <div className="col-span-2 h-4 animate-pulse rounded bg-slate-200" />
            <div className="col-span-2 h-4 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
