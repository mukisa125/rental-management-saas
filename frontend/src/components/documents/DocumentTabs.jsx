import { categoryTabs } from './documentUtils';

export default function DocumentTabs({ activeCategory, onChange }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categoryTabs.map((tab) => {
          const active = activeCategory === tab;
          return (
            <button
              key={tab}
              onClick={() => onChange(tab)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}
