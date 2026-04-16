import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'alert' | 'warning' | 'success';
  className?: string;
}

export default function MetricCard({
  label,
  value,
  subtext,
  trend,
  trendValue,
  icon,
  variant = 'default',
  className = '',
}: MetricCardProps) {
  const variantConfig = {
    default: {
      card: 'bg-white border border-slate-200/80',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueColor: 'text-slate-800',
      accentBar: 'bg-blue-500',
    },
    alert: {
      card: 'bg-white border border-red-200/80',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      valueColor: 'text-red-700',
      accentBar: 'bg-red-500',
    },
    warning: {
      card: 'bg-white border border-amber-200/80',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
      accentBar: 'bg-amber-500',
    },
    success: {
      card: 'bg-white border border-emerald-200/80',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700',
      accentBar: 'bg-emerald-500',
    },
  };

  const trendColors = {
    up: 'text-emerald-600 bg-emerald-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-slate-500 bg-slate-100',
  };

  const cfg = variantConfig[variant];
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={`relative rounded-xl overflow-hidden flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 ${cfg.card} ${className}`}
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)', padding: '18px 20px 16px' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.05)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)';
      }}
    >
      {/* Accent top bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${cfg.accentBar}`} />

      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 leading-tight">
          {label}
        </p>
        <div className={`p-2 rounded-lg ${cfg.iconBg} ${cfg.iconColor} flex-shrink-0`}>
          {icon}
        </div>
      </div>

      <div>
        <p className={`text-[28px] font-bold font-tabular leading-none ${cfg.valueColor}`}>
          {value}
        </p>
        {subtext && (
          <p className="text-[11.5px] text-slate-400 mt-1 leading-tight">{subtext}</p>
        )}
      </div>

      {trend && trendValue && (
        <div className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full w-fit ${trendColors[trend]}`}>
          <TrendIcon size={11} />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}