import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, Page, User } from '../api';
import { useAuth } from '../auth';
import Pager from '../components/Pager';
import Tag from '../components/Tag';
import { phone, when } from '../format';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [data, setData] = useState<Page<User> | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => {
    api
      .users({ search: search.trim(), status, page })
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [search, status, page]);

  // Wait a moment after typing before asking the server.
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function toggle(user: User) {
    const next = user.status === 'active' ? 'suspended' : 'active';
    if (next === 'suspended' && !window.confirm(`Suspend ${phone(user.phoneNumber)}?`)) return;
    setBusyId(user.id);
    try {
      await api.setUserStatus(user.id, next);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change the status');
    } finally {
      setBusyId('');
    }
  }

  return (
    <>
      <h1>Users</h1>

      <div className="toolbar">
        <input
          placeholder="Search by name or number"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
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
                <td colSpan={6} className="muted">No users match.</td>
              </tr>
            )}
            {data?.items.map((u) => (
              <tr key={u.id}>
                <td>{u.name || <span className="muted">-</span>}</td>
                <td>{phone(u.phoneNumber)}</td>
                <td>{u.role}</td>
                <td>
                  <Tag value={u.status} />
                </td>
                <td>{when(u.createdAt)}</td>
                <td className="right">
                  {u.id === me?.id ? (
                    <span className="muted">You</span>
                  ) : (
                    <button className="btn small" disabled={busyId === u.id} onClick={() => toggle(u)}>
                      {u.status === 'active' ? 'Suspend' : 'Reactivate'}
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
