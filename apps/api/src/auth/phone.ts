// Phone numbers are stored in one form (+91XXXXXXXXXX) so that
// "98765 43210" and "+919876543210" are the same user.
export function normalizePhone(input: string): string {
  const cleaned = input.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
  return cleaned;
}
