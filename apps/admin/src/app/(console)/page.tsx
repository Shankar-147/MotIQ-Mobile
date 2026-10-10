'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminPayment, AdminUser, api } from '@/lib/api';
import { formatDate, formatMoney, formatPhone } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';

export default function OverviewPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [payments, setPayments] = useState<AdminPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.users(), api.payments()])
      .then(([u, p]) => {
        setUsers(u);
        setPayments(p);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!users || !payments) return <p className="text-sm text-stone-500">Loading…</p>;

  const inr = payments.filter((p) => p.currency === 'INR');
  const collected = inr.filter((p) => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter((p) => p.status === 'pending').length;
  const suspended = users.filter((u) => u.status === 'suspended').length;

  const stats = [
    { label: 'Users', value: users.length, note: `${suspended} suspended` },
    { label: 'Payments', value: payments.length, note: `${pending} pending` },
    { label: 'Collected (INR)', value: formatMoney(collected, 'INR'), note: 'succeeded only' },
  ];

  return (
    <div>
      <h1 className="mb-5 text-xl font-semibold">Overview</h1>

      <div className="mb-8 grid max-w-3xl grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded border border-stone-300 bg-white px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-stone-500">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-stone-500">{s.note}</div>
          </div>
        ))}
      </div>

      <div className="mb-2 flex max-w-3xl items-baseline justify-between">
        <h2 className="text-sm font-semibold">Latest payments</h2>
        <Link href="/payments" className="text-sm text-brand-700 hover:underline">
          View all
        </Link>
      </div>
      <div className="max-w-3xl overflow-hidden rounded border border-stone-300 bg-white">
        <table className="w-full">
          <thead className="border-b border-stone-200 bg-stone-50">
            <tr>
              <th className="th">User</th>
              <th className="th">Amount</th>
              <th className="th">Status</th>
              <th className="th">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {payments.slice(0, 5).map((p) => (
              <tr key={p.id}>
                <td className="td">{formatPhone(p.user.phoneNumber)}</td>
                <td className="td">{formatMoney(p.amount, p.currency)}</td>
                <td className="td">
                  <StatusBadge value={p.status} />
                </td>
                <td className="td text-stone-500">{formatDate(p.createdAt)}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td className="td text-stone-500" colSpan={4}>
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
