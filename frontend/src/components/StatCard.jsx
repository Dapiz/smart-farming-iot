import { TrendingUp } from 'lucide-react';

const COLOR_MAP = {
  primary: {
    iconBg: 'bg-gradient-to-br from-primary-500 to-primary-600',
    accent: 'text-primary-600',
    glow: 'shadow-glow',
  },
  teal: {
    iconBg: 'bg-gradient-to-br from-accent-500 to-accent-600',
    accent: 'text-accent-600',
    glow: 'shadow-glow-teal',
  },
  green: {
    iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
    accent: 'text-green-600',
    glow: 'shadow-glow',
  },
  blue: {
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    accent: 'text-blue-600',
    glow: '',
  },
  gray: {
    iconBg: 'bg-gradient-to-br from-gray-400 to-gray-500',
    accent: 'text-gray-500',
    glow: '',
  },
  orange: {
    iconBg: 'bg-gradient-to-br from-orange-400 to-orange-500',
    accent: 'text-orange-600',
    glow: '',
  },
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  color = 'primary',
  suffix = '',
  trend = null, // misal "+5%" (opsional)
  subtitle = null,
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.primary;

  return (
    <div className="card-hover animate-in">
      <div className="flex items-start justify-between">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center text-white ${c.iconBg} ${c.glow}`}
        >
          <Icon className="w-5 h-5" strokeWidth={2.2} />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" /> {trend}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            {value}
          </span>
          {suffix && <span className="text-sm text-gray-500 font-medium">{suffix}</span>}
        </div>
        <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );
}