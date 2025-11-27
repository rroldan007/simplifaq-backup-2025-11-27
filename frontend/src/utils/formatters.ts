export const formatCurrency = (value: number, currency: string = 'CHF'): string => {
  return new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('fr-CH').format(value);
};

export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('fr-CH', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};
