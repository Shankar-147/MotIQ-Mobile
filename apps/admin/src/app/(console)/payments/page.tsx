'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminPayment, api, PaymentStatus } from '@/lib/api';
import { formatDate, formatMoney, formatPhone } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';

const statuses: Array<'all' | PaymentStatus> = ['all', 'pending', 'succeeded', 'failed', 'refunded'];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | PaymentStatus>('all');

  useEffect(() => {
    api.payments().then(setPayments).catch((e) => setError(e.message));
  }, []);

  const visible = useMemo(() => {
    const q = query.replace(/\s/g, '');
    return (payments ?? []).filter(
      (p) => (status === 'all' || p.status === status) && p.user.phoneNumber.includes(q),
    );
  }, [payments, query, status]);

  const shownInr = visible
    .filter((p) => p.currency === 'INR')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <h1 className="mb-5 text-xl font-semibold">Payments</h1>

      <div className="mb-4 flex items-center gap-3">
        <input
          className="field max-w-xs"
          placeholder="Search by phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded px-3 py-1.5 text-sm capitalize ${
                status === s ? 'bg-ink text-white' : 'bg-white text-stone-600 hover:bg-stone-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <div className="overflow-hidden rounded border border-stone-300 bg-white">
        <table className="w-full">
          <thead className="border-b border-stone-200 bg-stone-50">
            <tr>
              <th className="th">Payment</th>
              <th className="th">User</th>
              <th className="th">Amount</th>
              <th className="th">Status</th>
              <th className="th">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {!payments && (
              <tr>
                <td className="td text-stone-500" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {payments && visible.length === 0 && (
              <tr>
                <td className="td text-stone-500" colSpan={5}>
                  No payments match.
                </td>
              </tr>
            )}
            {visible.map((p) => (
              <tr key={p.id}>
                <td className="td font-mono text-xs text-stone-500">{p.id.slice(0, 8)}</td>
                <td className="td">{formatPhone(p.user.phoneNumber)}</td>
                <td className="td font-medium">{formatMoney(p.amount, p.currency)}</td>
                <td className="td">
                  <StatusBadge value={p.status} />
                </td>
                <td className="td text-stone-500">{formatDate(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
          {payments && visible.length > 0 && (
            <tfoot className="border-t border-stone-200 bg-stone-50">
              <tr>
                <td className="td text-stone-500" colSpan={2}>
                  {visible.length} shown
                </td>
                <td className="td font-semibold" colSpan={3}>
                  {formatMoney(shownInr, 'INR')} <span className="font-normal text-stone-500">in INR</span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
