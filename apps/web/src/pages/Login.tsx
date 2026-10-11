import { FormEvent, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';

function toE164(input: string): string {
  const digits = input.replace(/\D/g, '');
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

export default function Login() {
  const { signIn } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.requestOtp(toE164(phone));
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { accessToken } = await api.verifyOtp(toE164(phone), code, name.trim() || undefined);
      await signIn(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="brand big">
          Mot<b>IQ</b>
        </h1>
        <p className="muted">Roadside assistance platform</p>

        {step === 'phone' ? (
          <form onSubmit={sendCode}>
            <label htmlFor="phone">Mobile number</label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
              inputMode="tel"
              autoFocus
            />
            <button className="btn primary wide" disabled={busy || phone.replace(/\D/g, '').length < 10}>
              {busy ? 'Sending...' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <label htmlFor="code">Enter the 6 digit code sent to {toE164(phone)}</label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
            <label htmlFor="name">Your name (only needed the first time)</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn primary wide" disabled={busy || code.length !== 6}>
              {busy ? 'Checking...' : 'Sign in'}
            </button>
            <button type="button" className="link" onClick={() => { setStep('phone'); setCode(''); setError(''); }}>
              Use a different number
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}
        <p className="hint">No SMS service is connected yet, so the code is printed in the API terminal.</p>
      </div>
    </div>
  );
}
