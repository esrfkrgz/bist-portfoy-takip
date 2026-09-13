export function formatCurrency(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '₺0,00';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPrice(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '0,00';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number | undefined | null, withSign = true): string {
  if (value === undefined || value === null || isNaN(value)) return '0,00%';
  const prefix = withSign && value > 0 ? '+' : '';
  return `${prefix}${new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

export function formatLargeNumber(value: number | undefined | null, isCurrency = false): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  const prefix = isCurrency ? '₺' : '';

  if (Math.abs(value) >= 1_000_000_000_000) {
    return `${prefix}${(value / 1_000_000_000_000).toFixed(2).replace('.', ',')} Trilyon`;
  }
  if (Math.abs(value) >= 1_000_000_000) {
    return `${prefix}${(value / 1_000_000_000).toFixed(2).replace('.', ',')} Mr`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${prefix}${(value / 1_000_000).toFixed(2).replace('.', ',')} M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${prefix}${(value / 1_000).toFixed(1).replace('.', ',')} B`;
  }
  return `${prefix}${new Intl.NumberFormat('tr-TR').format(value)}`;
}

export function formatDate(dateString: string | number): string {
  if (!dateString) return '';
  const date = typeof dateString === 'number' 
    ? new Date(dateString > 10000000000 ? dateString : dateString * 1000) 
    : new Date(dateString);
  
  if (isNaN(date.getTime())) return String(dateString);
  
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string | number | Date): string {
  const date = dateString instanceof Date ? dateString : new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getTradingViewRatingLabel(rating: number): {
  label: string;
  colorClass: string;
  badgeClass: string;
} {
  if (rating >= 0.5) {
    return {
      label: 'Güçlü Al',
      colorClass: 'text-emerald-400',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
  }
  if (rating >= 0.1) {
    return {
      label: 'Al',
      colorClass: 'text-emerald-300',
      badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    };
  }
  if (rating > -0.1) {
    return {
      label: 'Nötr',
      colorClass: 'text-amber-300',
      badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    };
  }
  if (rating > -0.5) {
    return {
      label: 'Sat',
      colorClass: 'text-rose-300',
      badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    };
  }
  return {
    label: 'Güçlü Sat',
    colorClass: 'text-rose-400',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };
}
