import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, Payment } from '../api';
import Tag from '../components/Tag';
import { money, toMinorUnits, when } from '../format';

export default function Payments() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    api.myPayments().then(setPayments).catch((e) => setError(e.message));
  }, []);

  const minor = toMinorUnits(amount);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (minor === null) return;
    setError('');
    try {
      const created = await api.createPayment(minor, currency);
      setPayments((list) => [created, ...(list ?? [])]);
      setAmount('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the payment');
    }
  }

  async function confirm(id: string) {
    setBusyId(id);
    setError('');
    try {
      const updated = await api.confirmPayment(id);
      setPayments((list) => list?.map((p) => (p.id === id ? updated : p)) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not confirm the payment');
    } finally {
      setBusyId('');
    }
  }

  return (
    <>
      <h1>My payments</h1>

      <form className="card inline-form" onSubmit={create}>
        <div>
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="499.00"
            inputMode="decimal"
          />
        </div>
        <div>
          <label htmlFor="currency">Currency</label>
          <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <button className="btn primary" disabled={minor === null}>
          Create payment
        </button>
        {amount !== '' && minor === null && <span className="error">Enter an amount like 499 or 499.50</span>}
      </form>

      {error && <p className="error">{error}</p>}

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Created</th>
              <th>Reference</th>
              <th className="num">Amount</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {payments === null && (
              <tr>
                <td colSpan={5} className="muted">Loading...</td>
              </tr>
            )}
            {payments?.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">No payments yet. Create one above.</td>
              </tr>
            )}
            {payments?.map((p) => (
              <tr key={p.id}>
                <td>{when(p.createdAt)}</td>
                <td className="mono">{p.id.slice(0, 8)}</td>
                <td className="num">{money(p.amount, p.currency)}</td>
                <td>
                  <Tag value={p.status} />
                </td>
                <td className="right">
                  {p.status === 'pending' && (
                    <button className="btn small" disabled={busyId === p.id} onClick={() => confirm(p.id)}>
                      Confirm payment
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">
        There is no payment gateway connected yet, so "Confirm payment" stands in for the gateway telling us
        the money arrived.
      </p>
    </>
  );
}
