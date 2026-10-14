import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, Page, ProviderDetail, ProviderRow } from '../api';
import Pager from '../components/Pager';
import Tag from '../components/Tag';
import { phone, when } from '../format';

const DOCUMENT_NAMES: Record<string, string> = {
  driving_license: 'Driving licence',
  vehicle_registration: 'Vehicle registration',
  id_proof: 'ID proof',
};

export default function AdminProviders() {
  const [data, setData] = useState<Page<ProviderRow> | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<ProviderDetail | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .providers({ verification: filter, page })
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [filter, page]);

  useEffect(load, [load]);

  async function show(id: string) {
    setError('');
    setNote('');
    try {
      setOpen(await api.provider(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the provider');
    }
  }

  async function decide(decision: 'approved' | 'rejected') {
    if (!open) return;
    setBusy(true);
    setError('');
    try {
      await api.reviewProvider(open.id, decision, note.trim() || undefined);
      setOpen(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the decision');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Providers</h1>

      <div className="toolbar">
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="pending">Waiting for approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All providers</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      {open && (
        <div className="card">
          <h2>{open.businessName}</h2>
          <p className="muted">
            {open.user.name ?? 'No name'} · {phone(open.user.phoneNumber)} · <Tag value={open.verification} />
          </p>

          <h2>Documents</h2>
          {open.documents.length === 0 ? (
            <p className="muted">This provider has not uploaded any documents, so cannot be approved yet.</p>
          ) : (
            <ul className="plain">
              {open.documents.map((d) => (
                <li key={d.id}>
                  {DOCUMENT_NAMES[d.type] ?? d.type} - <span className="mono">{d.fileUrl}</span>{' '}
                  <span className="muted">({when(d.createdAt)})</span>
                </li>
              ))}
            </ul>
          )}

          <label htmlFor="note">Note for the provider (optional)</label>
          <input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          <p>
            <button className="btn primary" disabled={busy} onClick={() => decide('approved')}>
              Approve
            </button>{' '}
            <button className="btn" disabled={busy} onClick={() => decide('rejected')}>
              Reject
            </button>{' '}
            <button className="link" onClick={() => setOpen(null)}>
              Close
            </button>
          </p>
        </div>
      )}

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Business</th>
              <th>Contact</th>
              <th>Documents</th>
              <th>Status</th>
              <th>Online</th>
              <th>Applied</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data === null && (
              <tr>
                <td colSpan={7} className="muted">Loading...</td>
              </tr>
            )}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">No providers here.</td>
              </tr>
            )}
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td>{p.businessName}</td>
                <td>
                  {p.user.name ?? '-'}
                  <br />
                  <span className="muted">{phone(p.user.phoneNumber)}</span>
                </td>
                <td>{p._count.documents}</td>
                <td>
                  <Tag value={p.verification} />
                </td>
                <td>{p.online ? p.areaName ?? 'yes' : <span className="muted">no</span>}</td>
                <td>{when(p.createdAt)}</td>
                <td className="right">
                  <button className="btn small" onClick={() => show(p.id)}>
                    Review
                  </button>
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
