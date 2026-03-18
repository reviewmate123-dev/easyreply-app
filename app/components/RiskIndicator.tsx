'use client';

import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface RiskIndicatorProps {
  level: 'low' | 'medium' | 'high';
  showLabel?: boolean;
  className?: string;
}

export default function RiskIndicator({ level, showLabel = false, className = '' }: RiskIndicatorProps) {
  const config = {
    low: {
      icon: Info,
      color: 'text-green-600',
      bg: 'bg-green-50',
      label: 'Low Risk'
    },
    medium: {
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      label: 'Medium Risk'
    },
    high: {
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      label: 'High Risk'
    }
  };

  const { icon: Icon, color, bg, label } = config[level];

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full ${bg} ${className}`}>
      <Icon className={`h-4 w-4 ${color} mr-1`} />
      {showLabel && <span className={`text-xs font-medium ${color}`}>{label}</span>}
    </div>
  );
}