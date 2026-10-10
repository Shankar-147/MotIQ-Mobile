const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const TOKEN_KEY = 'motiq_admin_token';

export type UserStatus = 'active' | 'suspended';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Me {
  id: string;
  phoneNumber: string;
  role: 'user' | 'admin';
}

export interface AdminUser {
  id: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  status: UserStatus;
  createdAt: string;
}

export interface AdminPayment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  user: { phoneNumber: string };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (token: string) => window.localStorage.setItem(TOKEN_KEY, token),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the API. Is it running on port 3001?');
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(res.status, message ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  requestOtp: (phoneNumber: string) =>
    request<void>('/auth/otp/request', { method: 'POST', body: JSON.stringify({ phoneNumber }) }),
  verifyOtp: (phoneNumber: string, code: string) =>
    request<{ accessToken: string }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code }),
    }),
  me: () => request<Me>('/auth/me'),
  users: () => request<AdminUser[]>('/admin/users'),
  setUserStatus: (id: string, status: UserStatus) =>
    request<AdminUser>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  payments: () => request<AdminPayment[]>('/admin/payments'),
};
