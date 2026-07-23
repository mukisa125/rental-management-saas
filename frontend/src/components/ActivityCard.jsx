import React from 'react';

const ActivityCard = ({ activities = [] }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-black text-slate-900">Recent Activity</h3>
      <ul className="space-y-3">
        {activities.length === 0 && <li className="text-sm text-slate-500">No recent activity</li>}
        {activities.map((a, i) => (
          <li key={i} className="flex items-start gap-3 py-2 border-b last:border-b-0 border-slate-100">
            <div className="w-9 h-9 rounded-md bg-slate-50 flex items-center justify-center text-sm text-slate-700">{a.icon || '-'}</div>
            <div className="flex-1">
              <div className="text-sm text-slate-800 font-medium">{a.message}</div>
              <div className="text-xs text-slate-400">{a.time}</div>
            </div>
            <div className={`text-xs ${a.type === 'success' ? 'text-emerald-600' : a.type === 'warning' ? 'text-amber-500' : 'text-slate-500'}`}>
              <span className="rounded-full bg-slate-50 px-2 py-1 text-xs font-bold">{a.badge}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActivityCard;
