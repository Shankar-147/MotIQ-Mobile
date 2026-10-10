const styles: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  succeeded: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
  refunded: 'bg-stone-200 text-stone-700',
  admin: 'bg-stone-800 text-white',
  user: 'bg-stone-200 text-stone-700',
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${
        styles[value] ?? 'bg-stone-200 text-stone-700'
      }`}
    >
      {value}
    </span>
  );
}
