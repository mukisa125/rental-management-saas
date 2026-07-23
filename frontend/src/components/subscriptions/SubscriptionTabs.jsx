const SubscriptionTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { key: 'active', label: 'Active Subscriptions' },
    { key: 'trial', label: 'Trial Subscriptions' },
    { key: 'expired', label: 'Expired' },
    { key: 'past_due', label: 'Past Due' },
    { key: 'plans', label: 'Subscription Plans' }
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-2 rounded-full text-sm ${activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700 border border-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionTabs;
