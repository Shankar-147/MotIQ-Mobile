'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { formatPhone } from '@/lib/format';

const links = [
  { href: '/', label: 'Overview' },
  { href: '/users', label: 'Users' },
  { href: '/payments', label: 'Payments' },
];

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { state, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state.status === 'out') router.replace('/login');
  }, [state, router]);

  if (state.status !== 'in') {
    return <div className="p-8 text-sm text-stone-500">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-52 shrink-0 flex-col border-r border-stone-300 bg-white">
        <div className="px-5 py-5 text-lg font-bold tracking-tight">
          MOT<span className="text-brand-600">IQ</span>
        </div>
        <nav className="flex-1 px-2">
          {links.map((l) => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`mb-0.5 block rounded px-3 py-2 text-sm ${
                  active ? 'bg-brand-50 font-semibold text-brand-800' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-stone-200 px-5 py-4 text-xs">
          <div className="text-stone-500">Signed in as</div>
          <div className="mb-2 font-medium">{formatPhone(state.user.phoneNumber)}</div>
          <button className="text-stone-500 underline hover:text-ink" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
