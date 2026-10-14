import { useEffect, useState } from 'react';
import { api, AuditEntry, Page } from '../api';
import Pager from '../components/Pager';
import { actionLabel, when } from '../format';

export default function AdminAudit() {
  const [data, setData] = useState<Page<AuditEntry> | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.audit(page).then(setData).catch((e) => setError(e.message));
  }, [page]);

  return (
    <>
      <h1>Audit log</h1>
      {error && <p className="error">{error}</p>}

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Detail</th>
              <th>Record</th>
            </tr>
          </thead>
          <tbody>
            {data === null && (
              <tr>
                <td colSpan={4} className="muted">Loading...</td>
              </tr>
            )}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">Nothing has been done yet.</td>
              </tr>
            )}
            {data?.items.map((entry) => (
              <tr key={entry.id}>
                <td>{when(entry.createdAt)}</td>
                <td>{actionLabel(entry.action)}</td>
                <td>{entry.detail ?? <span className="muted">-</span>}</td>
                <td className="mono">{entry.targetId.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </>
  );
}
