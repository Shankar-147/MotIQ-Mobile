import { FormEvent, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { phone } from '../format';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      setUser(await api.updateName(name.trim()));
      setMessage('Saved');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save');
    }
  }

  if (!user) return null;

  return (
    <>
      <h1>Profile</h1>
      <form className="card form-narrow" onSubmit={save}>
        <label>Mobile number</label>
        <p className="static">{phone(user.phoneNumber)}</p>

        <label>Role</label>
        <p className="static">{user.role}</p>

        <label htmlFor="name">Name</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />

        <button className="btn primary" disabled={name.trim() === ''}>
          Save
        </button>
        {message && <p className="ok">{message}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </>
  );
}
