export default function ReportTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-w-max gap-6 px-5 py-3">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`relative whitespace-nowrap pb-2 text-sm font-bold transition-colors ${
              activeTab === tab.value ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {activeTab === tab.value && (
              <span className="absolute -bottom-1 left-0 h-0.5 w-full rounded bg-blue-600" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
