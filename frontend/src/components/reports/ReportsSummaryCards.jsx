export default function ReportsSummaryCards({ cards }) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${card.iconBg}`}>
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p
                  className="mt-1 max-w-full whitespace-normal break-words text-xl font-black leading-tight text-slate-900"
                  title={String(card.value || '')}
                >
                  {card.value}
                </p>
                <p className="mt-1 text-xs font-medium leading-snug text-slate-500">{card.description}</p>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
