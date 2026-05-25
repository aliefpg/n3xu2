import React from 'react';
import { cn } from '../lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: any;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
  dark?: boolean;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  iconClassName,
  dark = false
}: MetricCardProps) {
  return (
    <div 
      className={cn(
        "p-6 md:p-8 rounded-2xl border shadow-sm flex flex-col gap-1 relative overflow-hidden group hover:shadow-md transition-all font-sans",
        dark 
          ? "bg-slate-900 border-slate-800 text-white" 
          : "bg-white border-slate-200 text-slate-900",
        className
      )}
    >
      {Icon && (
        <div 
          className={cn(
            "absolute top-0 right-0 p-4 transition-transform group-hover:scale-110 duration-300",
            dark ? "opacity-10 text-blue-400" : "opacity-[0.06] text-slate-500",
            iconClassName
          )}
        >
          <Icon size={64} />
        </div>
      )}
      
      <span className={cn(
        "uppercase tracking-widest text-[9px] md:text-[10px] font-black leading-none",
        dark ? "text-slate-400" : "text-slate-500"
      )}>
        {title}
      </span>
      
      <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-1 animate-fadeIn">
        {value}
      </h3>
      
      {(subtitle || trend) && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {trend && (
            <span 
              className={cn(
                "text-[10px] font-extrabold px-1.5 py-0.5 rounded",
                trend.isPositive 
                  ? "bg-emerald-500/10 text-emerald-500" 
                  : "bg-rose-500/10 text-rose-500"
              )}
            >
              {trend.value}
            </span>
          )}
          {subtitle && (
            <span className={cn(
              "text-[10px] font-medium leading-none",
              dark ? "text-slate-400" : "text-slate-500"
            )}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
