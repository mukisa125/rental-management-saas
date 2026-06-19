import React from 'react';

const SubscriptionTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { key: 'managers', label: 'Manager Subscriptions' },
    { key: 'owners', label: 'Property Owner Subscriptions' },
    { key: 'self', label: 'Self Owner Subscriptions' },
    { key: 'plans', label: 'Subscription Plans' }
  ];

  return (
    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
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
