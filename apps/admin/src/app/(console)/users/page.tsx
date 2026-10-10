'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminUser, api, UserStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatPhone } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';

const filters: Array<{ value: 'all' | UserStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

export default function UsersPage() {
  const { state } = useAuth();
  const myId = state.status === 'in' ? state.user.id : null;

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | UserStatus>('all');
  const [workingOn, setWorkingOn] = useState<string | null>(null);

  useEffect(() => {
    api.users().then(setUsers).catch((e) => setError(e.message));
  }, []);

  const visible = useMemo(() => {
    const q = query.replace(/\s/g, '');
    return (users ?? []).filter(
      (u) => (filter === 'all' || u.status === filter) && u.phoneNumber.includes(q),
    );
  }, [users, query, filter]);

  async function toggle(user: AdminUser) {
    const next: UserStatus = user.status === 'active' ? 'suspended' : 'active';
    if (next === 'suspended' && !window.confirm(`Suspend ${formatPhone(user.phoneNumber)}? They will be signed out of the app.`)) {
      return;
    }
    setWorkingOn(user.id);
    setError(null);
    try {
      const updated = await api.setUserStatus(user.id, next);
      setUsers((prev) => prev!.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorkingOn(null);
    }
  }

  return (
    <div>
      <h1 className="mb-5 text-xl font-semibold">Users</h1>

      <div className="mb-4 flex items-center gap-3">
        <input
          className="field max-w-xs"
          placeholder="Search by phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded px-3 py-1.5 text-sm ${
                filter === f.value ? 'bg-ink text-white' : 'bg-white text-stone-600 hover:bg-stone-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <div className="overflow-hidden rounded border border-stone-300 bg-white">
        <table className="w-full">
          <thead className="border-b border-stone-200 bg-stone-50">
            <tr>
              <th className="th">Phone</th>
              <th className="th">Role</th>
              <th className="th">Status</th>
              <th className="th">Joined</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {!users && (
              <tr>
                <td className="td text-stone-500" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {users && visible.length === 0 && (
              <tr>
                <td className="td text-stone-500" colSpan={5}>
                  No users match.
                </td>
              </tr>
            )}
            {visible.map((u) => (
              <tr key={u.id}>
                <td className="td font-medium">{formatPhone(u.phoneNumber)}</td>
                <td className="td">
                  <StatusBadge value={u.role} />
                </td>
                <td className="td">
                  <StatusBadge value={u.status} />
                </td>
                <td className="td text-stone-500">{formatDate(u.createdAt)}</td>
                <td className="td text-right">
                  {u.id === myId ? (
                    <span className="text-xs text-stone-400">You</span>
                  ) : (
                    <button
                      className="btn-plain"
                      disabled={workingOn === u.id}
                      onClick={() => toggle(u)}
                    >
                      {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
