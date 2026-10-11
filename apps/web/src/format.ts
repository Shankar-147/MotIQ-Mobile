const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€' };

// Amounts are stored in paise/cents, so 49900 shows as ₹499.00
export function money(amount: number, currency: string): string {
  const value = (amount / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbols[currency] ?? currency + ' '}${value}`;
}

export function when(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function phone(value: string): string {
  const m = value.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : value;
}

// "499" or "499.50" to paise. Returns null if it is not a valid amount.
export function toMinorUnits(text: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(text.trim())) return null;
  const value = Math.round(parseFloat(text) * 100);
  return value > 0 ? value : null;
}

export function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    'user.suspended': 'Suspended a user',
    'user.reactivated': 'Reactivated a user',
    'payment.refunded': 'Refunded a payment',
  };
  return labels[action] ?? action;
}
