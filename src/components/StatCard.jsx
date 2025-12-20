/**
 * StatCard Component
 * İstatistik kartı
 */

import React from 'react';

export default function StatCard({
  label,
  value,
  change,
  color = 'text-white',
  icon: Icon,
  trend,
}) {
  const getTrendColor = () => {
    if (!trend) return 'text-slate-300';
    if (trend === 'up') return 'text-emerald-400';
    if (trend === 'down') return 'text-rose-400';
    return 'text-slate-300';
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <p className="text-slate-500 text-sm">{label}</p>
        {Icon && (
          <div className="p-2 bg-slate-800 rounded-lg">
            <Icon size={16} className="text-slate-400" />
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <h2 className={`text-3xl font-bold ${color}`}>{value}</h2>
        {change && (
          <span className={`text-xs bg-slate-800 px-2 py-1 rounded ${getTrendColor()}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
