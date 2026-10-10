const symbols: Record<string, string> = { INR: '₹', USD: '$' };

// amounts are stored in paise/cents
export function formatMoney(amount: number, currency: string): string {
  const value = (amount / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbols[currency] ?? currency + ' '}${value}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatPhone(phone: string): string {
  const m = phone.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : phone;
}
