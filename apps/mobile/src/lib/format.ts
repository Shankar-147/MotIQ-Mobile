const symbols: Record<string, string> = { INR: '₹', USD: '$' };

// amounts come from the API in paise/cents
export function formatMoney(amount: number, currency: string): string {
  const value = (amount / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${symbols[currency] ?? currency + ' '}${value}`;
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = d.getHours() < 12 ? 'am' : 'pm';
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${h}:${m} ${ampm}`;
}

export function formatPhone(phone: string): string {
  const m = phone.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : phone;
}
