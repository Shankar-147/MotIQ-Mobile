import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { phone } from '../format';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function logout() {
    signOut();
    navigate('/login');
  }

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">
          Mot<b>IQ</b>
        </span>
        <nav>
          <NavLink to="/" end>
            My payments
          </NavLink>
          {user?.role === 'admin' && (
            <>
              <NavLink to="/admin" end>
                Dashboard
              </NavLink>
              <NavLink to="/admin/providers">Providers</NavLink>
              <NavLink to="/admin/requests">Requests</NavLink>
              <NavLink to="/admin/users">Users</NavLink>
              <NavLink to="/admin/payments">Payments</NavLink>
              <NavLink to="/admin/audit">Audit log</NavLink>
            </>
          )}
        </nav>
        <div className="who">
          <NavLink to="/profile">{user?.name || (user && phone(user.phoneNumber))}</NavLink>
          <button className="link" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
