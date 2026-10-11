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
  const totalRequests = Object.values(stats.requests).reduce((a, b) => a + b, 0);
  const inProgress =
    stats.requests.assigned +
    stats.requests.accepted +
    stats.requests.en_route +
    stats.requests.arrived +
    stats.requests.in_progress;

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
          <span className="muted">Platform commission</span>
          {stats.payments.collected.length === 0 ? (
            <strong>-</strong>
          ) : (
            stats.payments.collected.map((c) => (
              <strong key={c.currency}>{money(c.commission, c.currency)}</strong>
            ))
          )}
          <span className="muted">kept from paid jobs</span>
        </div>
      </div>

      <div className="stat-row">
        <div className="card stat">
          <span className="muted">Requests</span>
          <strong>{totalRequests}</strong>
          <span className="muted">{stats.requests.completed} completed</span>
        </div>
        <div className="card stat">
          <span className="muted">In progress</span>
          <strong>{inProgress}</strong>
          <span className="muted">assigned, on the way or working</span>
        </div>
        <div className="card stat">
          <span className="muted">No provider found</span>
          <strong>{stats.requests.no_provider}</strong>
          <span className="muted">{stats.requests.cancelled} cancelled</span>
        </div>
        <div className="card stat">
          <span className="muted">Refunded</span>
          <strong>{stats.payments.counts.refunded}</strong>
          <span className="muted">{stats.payments.counts.failed} failed payments</span>
        </div>
      </div>

      <div className="card">
        <h2>Where to go</h2>
        <ul className="plain">
          <li>
            <Link to="/admin/providers">Providers</Link> - review documents, approve or reject applications
          </li>
          <li>
            <Link to="/admin/requests">Requests</Link> - every help request and where it stands
          </li>
          <li>
            <Link to="/admin/users">Users</Link> - search people, suspend or reactivate an account
          </li>
          <li>
            <Link to="/admin/payments">Payments</Link> - see every payment, refund a succeeded one
          </li>
          <li>
            <Link to="/admin/audit">Audit log</Link> - who did what, and when
          </li>
        </ul>
      </div>
    </>
  );
}
