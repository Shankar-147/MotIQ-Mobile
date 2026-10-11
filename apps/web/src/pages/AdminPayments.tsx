import { useCallback, useEffect, useState } from 'react';
import { AdminPayment, api, ApiError, Page } from '../api';
import Pager from '../components/Pager';
import Tag from '../components/Tag';
import { money, phone, when } from '../format';

export default function AdminPayments() {
  const [data, setData] = useState<Page<AdminPayment> | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => {
    api
      .allPayments({ status, page })
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [status, page]);

  useEffect(load, [load]);

  async function refund(payment: AdminPayment) {
    if (!window.confirm(`Refund ${money(payment.amount, payment.currency)} to ${phone(payment.user.phoneNumber)}?`)) {
      return;
    }
    setBusyId(payment.id);
    try {
      await api.refund(payment.id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not refund');
    } finally {
      setBusyId('');
    }
  }

  return (
    <>
      <h1>All payments</h1>

      <div className="toolbar">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Created</th>
              <th>Reference</th>
              <th>User</th>
              <th className="num">Amount</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data === null && (
              <tr>
                <td colSpan={6} className="muted">Loading...</td>
              </tr>
            )}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">No payments match.</td>
              </tr>
            )}
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td>{when(p.createdAt)}</td>
                <td className="mono">{p.id.slice(0, 8)}</td>
                <td>
                  {phone(p.user.phoneNumber)}
                  {p.user.name && <span className="muted"> ({p.user.name})</span>}
                </td>
                <td className="num">{money(p.amount, p.currency)}</td>
                <td>
                  <Tag value={p.status} />
                </td>
                <td className="right">
                  {p.status === 'succeeded' && (
                    <button className="btn small" disabled={busyId === p.id} onClick={() => refund(p)}>
                      Refund
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </>
  );
}
