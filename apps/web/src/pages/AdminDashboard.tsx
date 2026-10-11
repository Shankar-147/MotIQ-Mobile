import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Stats } from '../api';
import { money } from '../format';

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.stats().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Loading...</p>;

  const totalUsers = stats.users.active + stats.users.suspended;
  const totalPayments = Object.values(stats.payments.counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <h1>Dashboard</h1>

      <div className="stat-row">
        <div className="card stat">
          <span className="muted">Users</span>
          <strong>{totalUsers}</strong>
          <span className="muted">{stats.users.suspended} suspended</span>
        </div>
        <div className="card stat">
          <span className="muted">Payments</span>
          <strong>{totalPayments}</strong>
          <span className="muted">{stats.payments.counts.pending} waiting to be confirmed</span>
        </div>
        <div className="card stat">
          <span className="muted">Money collected</span>
          {stats.payments.collected.length === 0 ? (
            <strong>-</strong>
          ) : (
            stats.payments.collected.map((c) => <strong key={c.currency}>{money(c.amount, c.currency)}</strong>)
          )}
          <span className="muted">succeeded payments only</span>
        </div>
        <div className="card stat">
          <span className="muted">Refunded</span>
          <strong>{stats.payments.counts.refunded}</strong>
          <span className="muted">{stats.payments.counts.failed} failed</span>
        </div>
      </div>

      <div className="card">
        <h2>Where to go</h2>
        <ul className="plain">
          <li>
            <Link to="/admin/users">Users</Link> - search people, suspend or reactivate an account
          </li>
          <li>
            <Link to="/admin/payments">All payments</Link> - see every payment, refund a succeeded one
          </li>
          <li>
            <Link to="/admin/audit">Audit log</Link> - who did what, and when
          </li>
        </ul>
      </div>
    </>
  );
}
