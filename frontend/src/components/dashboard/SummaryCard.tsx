import React from 'react';

interface SummaryCardProps {
  title: string;
  value: number;
  change?: number;
  amount?: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'pink';
  isCurrency?: boolean;
  currency?: string;
  isPercent?: boolean;
  tooltipLabel?: string;
}

export function SummaryCard({
  title,
  value,
  change,
  amount,
  icon,
  color,
  isCurrency = false,
  currency = 'CHF',
  isPercent = false,
  tooltipLabel,
}: SummaryCardProps) {
  // Keep prop for backward compatibility, but align with app neutral theme
  const colorClasses = {
    blue: '',
    green: '',
    yellow: '',
    red: '',
    purple: '',
    indigo: '',
    pink: '',
  } as const;

  const formatValue = (val: number) => {
    if (isCurrency) {
      return new Intl.NumberFormat('fr-CH', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);
    }
    if (isPercent) {
      return `${new Intl.NumberFormat('fr-CH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(val)}%`;
    }
    return new Intl.NumberFormat('fr-CH').format(val);
  };

  const formatChange = (val?: number) => {
    if (val === undefined || val === null) return null;
    const isPositive = val >= 0;
    return (
      <span
        title={tooltipLabel || "Comparé à la période précédente"}
        className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
          isPositive
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}
      >
        {isPositive ? '↑' : '↓'} {Math.abs(val)}%
      </span>
    );
  };

  return (
    <div className={`card-theme overflow-hidden rounded-lg h-full`}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-md bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] flex items-center justify-center">
              <span className="text-lg inline-flex items-center">{icon}</span>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-[var(--color-text-secondary)] truncate">
                {title}
              </dt>
              <dd className="text-2xl font-bold text-[var(--color-text-primary)]">
                {formatValue(value)}
                {change !== undefined && formatChange(change)}
              </dd>
              {amount !== undefined && amount > 0 && (
                <dd className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {isCurrency ? formatValue(amount) : `${amount} facture(s)`}
                </dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
