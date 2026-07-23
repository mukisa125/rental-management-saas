export default function ReportSummaryPanel({ title, items }) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {safeItems.map((item) => (
          <article key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-1 text-lg font-black text-slate-900">{item.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
