import React from 'react';

const StatusDot = ({ status }) => {
  const map = {
    operational: 'bg-green-500',
    degraded: 'bg-orange-400',
    down: 'bg-red-500',
    unknown: 'bg-gray-300',
  };
  return <span className={`inline-block w-3 h-3 rounded-full ${map[status] || map.unknown}`} />;
};

const SystemHealthCard = ({ systems = {} }) => {
  const items = [
    { key: 'api', label: 'API Service' },
    { key: 'database', label: 'Database' },
    { key: 'storage', label: 'File Storage' },
    { key: 'email', label: 'Email Service' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">System Health</h3>
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.key} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusDot status={systems[it.key] || 'unknown'} />
              <div className="text-sm text-slate-700">{it.label}</div>
            </div>
            <div className="text-sm text-slate-500 capitalize">{systems[it.key] || 'unknown'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemHealthCard;
