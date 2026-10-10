'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { state, signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === 'in') router.replace('/');
  }, [state, router]);

  const notice = state.status === 'out' ? state.notice : undefined;

  function normalized() {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 ? `+91${digits}` : `+${digits}`;
  }

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.requestOtp(normalized());
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { accessToken } = await api.verifyOtp(normalized(), code);
      await signIn(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <div className="text-xl font-bold tracking-tight">
            MOT<span className="text-brand-600">IQ</span>
          </div>
          <div className="text-sm text-stone-500">Operations console</div>
        </div>

        <div className="rounded border border-stone-300 bg-white p-6">
          {step === 'phone' ? (
            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                  Phone number
                </label>
                <input
                  id="phone"
                  className="field"
                  inputMode="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                />
              </div>
              <button className="btn-primary w-full" disabled={busy || phone.replace(/\D/g, '').length < 10}>
                {busy ? 'Sending…' : 'Send code'}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <div>
                <label htmlFor="code" className="mb-1 block text-sm font-medium">
                  6-digit code sent to {normalized()}
                </label>
                <input
                  id="code"
                  className="field tracking-[0.4em]"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </div>
              <button className="btn-primary w-full" disabled={busy || code.length !== 6}>
                {busy ? 'Checking…' : 'Sign in'}
              </button>
              <button
                type="button"
                className="w-full text-sm text-stone-500 hover:text-ink"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError(null);
                }}
              >
                Use a different number
              </button>
            </form>
          )}

          {(error || notice) && (
            <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error ?? notice}</p>
          )}
        </div>

        <p className="mt-4 text-xs text-stone-500">
          No SMS provider yet — in development the code is printed in the API terminal.
        </p>
      </div>
    </main>
  );
}
