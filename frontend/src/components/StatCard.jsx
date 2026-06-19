import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, trend, color = 'blue' }) => {
  const colorMap = {
    blue: {
      icon: 'text-blue-600',
      tile: 'bg-blue-50',
      trend: 'text-green-600'
    },
    green: {
      icon: 'text-green-600',
      tile: 'bg-green-50',
      trend: 'text-green-600'
    },
    red: {
      icon: 'text-rose-600',
      tile: 'bg-rose-50',
      trend: 'text-rose-600'
    },
    orange: {
      icon: 'text-orange-500',
      tile: 'bg-orange-50',
      trend: 'text-orange-500'
    },
    purple: {
      icon: 'text-violet-600',
      tile: 'bg-violet-50',
      trend: 'text-green-600'
    },
    gray: {
      icon: 'text-slate-600',
      tile: 'bg-slate-50',
      trend: 'text-slate-600'
    },
  };
  const palette = colorMap[color] || colorMap.blue;
  const isPositive = !String(trend || '').startsWith('-');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.10)]">
      <div className="flex items-center gap-5">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ${palette.tile}`}>
          {Icon ? <Icon className={`h-7 w-7 ${palette.icon}`} /> : null}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-500">{label}</div>
          <div className="mt-1 text-3xl font-black tracking-normal text-slate-950">{value}</div>
          {trend && (
            <div className="mt-2 flex items-center gap-2 text-xs font-bold">
              <span className={`inline-flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-orange-500'}`}>
                {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {trend}
              </span>
              <span className="font-semibold text-slate-500">vs last month</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
