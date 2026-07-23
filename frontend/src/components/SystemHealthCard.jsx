import React from 'react';

const StatusDot = ({ status }) => {
  const map = {
    operational: 'bg-emerald-500',
    degraded: 'bg-orange-400',
    down: 'bg-rose-500',
    unknown: 'bg-slate-300',
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-black text-slate-900">System Health</h3>
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
