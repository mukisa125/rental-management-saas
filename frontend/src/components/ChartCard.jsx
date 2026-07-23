import React from 'react';

export const LineSpark = ({ data = [], width = 200, height = 60, stroke = '#3b82f6' }) => {
  if (!data || data.length === 0) return <div className="h-16" />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / (max - min || 1)) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const ChartCard = ({ title, children }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <h3 className="mb-4 text-sm font-black text-slate-900">{title}</h3>
      <div>{children}</div>
    </div>
  );
};

export default ChartCard;
