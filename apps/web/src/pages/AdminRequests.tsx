import { useEffect, useState } from 'react';
import { api, Page, RequestRow } from '../api';
import Pager from '../components/Pager';
import Tag from '../components/Tag';
import { money, phone, when } from '../format';

const ISSUE_NAMES: Record<string, string> = {
  flat_tyre: 'Flat tyre',
  battery: 'Battery',
  fuel: 'Out of fuel',
  towing: 'Towing',
  engine: 'Engine trouble',
  other: 'Something else',
};

const STATUSES = [
  'requested',
  'assigned',
  'accepted',
  'en_route',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
  'no_provider',
];

export default function AdminRequests() {
  const [data, setData] = useState<Page<RequestRow> | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api
      .requests({ status, page })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [status, page]);

  return (
    <>
      <h1>Requests</h1>

      <div className="toolbar">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Created</th>
              <th>Problem</th>
              <th>Where</th>
              <th>Customer</th>
              <th>Provider</th>
              <th className="num">Fare</th>
              <th>Status</th>
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
                <td colSpan={7} className="muted">No requests match.</td>
              </tr>
            )}
            {data?.items.map((r) => (
              <tr key={r.id}>
                <td>{when(r.createdAt)}</td>
                <td>{ISSUE_NAMES[r.issueType] ?? r.issueType}</td>
                <td>
                  {r.areaName}
                  {r.distanceKm !== null && <span className="muted"> ({r.distanceKm} km)</span>}
                </td>
                <td>
                  {r.customer.name ?? '-'}
                  <br />
                  <span className="muted">{phone(r.customer.phoneNumber)}</span>
                </td>
                <td>{r.provider?.businessName ?? <span className="muted">-</span>}</td>
                <td className="num">{money(r.fareTotal ?? r.baseFare, 'INR')}</td>
                <td>
                  <Tag value={r.status} />
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
