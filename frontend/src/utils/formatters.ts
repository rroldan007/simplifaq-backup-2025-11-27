export const formatCurrency = (value: number, currency: string = 'CHF'): string => {
  // Use de-CH for dot decimal separator (1'234.56)
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatAmount = (value: number): string => {
  // Use de-CH for dot decimal separator (1'234.56)
  return new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('de-CH').format(value);
};

export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('de-CH', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};
